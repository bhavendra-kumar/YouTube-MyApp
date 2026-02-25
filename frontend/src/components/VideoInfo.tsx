import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Code,
  Clock,
  Download,
  Facebook,
  Link2,
  ListPlus,
  Mail,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { getSocket } from "@/lib/socket";
import { notify } from "@/services/toast";
import Link from "next/link";
import { buildMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

const VideoInfo = ({ video, currentTimeSeconds }: any) => {
  const [likes, setlikes] = useState<number>(Number(video?.Like ?? 0));
  const [dislikes, setDislikes] = useState<number>(Number(video?.Dislike ?? 0));
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Array<any>>([]);
  const [playlistBusyId, setPlaylistBusyId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [startAtEnabled, setStartAtEnabled] = useState(false);
  const [startAtTime, setStartAtTime] = useState("0:00");
  const shareWasOpenRef = useRef(false);
  const lastHistoryKeyRef = useRef<string | null>(null);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(Number(video?.Like ?? 0));
    setDislikes(Number(video?.Dislike ?? 0));
    setIsLiked(false);
    setIsDisliked(false);
    setIsWatchLater(false);
    setSaveOpen(false);
  }, [video]);

  const isVideoInPlaylist = (p: any) => {
    const ids = Array.isArray(p?.videos) ? p.videos : [];
    return ids.some((x: any) => String(x) === String(video?._id));
  };

  const loadPlaylists = async () => {
    if (!user?._id) {
      notify.info("Sign in to save to playlists");
      return;
    }

    try {
      setPlaylistsLoading(true);
      const res = await axiosClient.get("/playlist/mine");
      setPlaylists(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      console.error(e);
      notify.error("Could not load playlists");
      setPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const togglePlaylist = async (playlistId: string) => {
    if (!user?._id) {
      notify.info("Sign in to save to playlists");
      return;
    }
    if (!video?._id) return;

    const current = playlists.find((p) => String(p?._id) === String(playlistId));
    if (!current) return;

    const wasIn = isVideoInPlaylist(current);
    const prev = playlists;

    // Optimistic update
    setPlaylists((items) =>
      items.map((p) => {
        if (String(p?._id) !== String(playlistId)) return p;
        const ids = Array.isArray(p?.videos) ? p.videos.map(String) : [];
        const vid = String(video._id);
        const nextIds = wasIn
          ? ids.filter((x: string) => x !== vid)
          : Array.from(new Set([...ids, vid]));
        return { ...p, videos: nextIds };
      })
    );

    try {
      setPlaylistBusyId(String(playlistId));
      if (wasIn) {
        await axiosClient.delete(`/playlist/${playlistId}/videos/${video._id}`);
        notify.success("Removed from playlist");
      } else {
        await axiosClient.post(`/playlist/${playlistId}/videos`, { videoId: video._id });
        notify.success("Saved to playlist");
      }
    } catch (e: any) {
      console.error(e);
      setPlaylists(prev);
      notify.error(e?.response?.data?.message || "Could not update playlist");
    } finally {
      setPlaylistBusyId(null);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareUrl(window.location.href);
  }, [video?._id]);

  useEffect(() => {
    if (!shareOpen) {
      shareWasOpenRef.current = false;
      return;
    }
    if (shareWasOpenRef.current) return;
    shareWasOpenRef.current = true;

    if (typeof window === "undefined") return;
    setShareUrl(window.location.href);
    setStartAtEnabled(false);
    const s = Math.max(
      0,
      Math.floor(typeof currentTimeSeconds === "number" ? currentTimeSeconds : 0)
    );
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    setStartAtTime(
      h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
        : `${m}:${String(sec).padStart(2, "0")}`
    );
  }, [shareOpen, currentTimeSeconds]);

  useEffect(() => {
    if (!video?._id) return;

    const socket = getSocket();
    socket.connect();
    socket.emit("video:join", video._id);

    const onLikeUpdated = (payload: { videoId: string; likes: number }) => {
      if (!payload || String(payload.videoId) !== String(video._id)) return;
      setlikes(payload.likes ?? 0);
    };

    const onDislikeUpdated = (payload: { videoId: string; dislikes: number }) => {
      if (!payload || String(payload.videoId) !== String(video._id)) return;
      setDislikes(payload.dislikes ?? 0);
    };

    socket.on("like:updated", onLikeUpdated);
    socket.on("dislike:updated", onDislikeUpdated)

    return () => {
      socket.emit("video:leave", video._id);
      socket.off("like:updated", onLikeUpdated);
      socket.off("dislike:updated", onDislikeUpdated);
    };
  }, [video?._id]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!video?._id) return;

      try {
        // Subscriber count works even without login.
        if (video?.uploader) {
          const countRes = await axiosClient.get(
            `/subscribe/count/${video.uploader}`
          );
          setSubscriberCount(Number(countRes.data?.subscribers ?? 0));
        } else {
          setSubscriberCount(0);
        }

        if (!user?._id) return;

        const [reactionRes, watchLaterRes, subscribeRes] = await Promise.all([
          axiosClient.get(`/like/status/${video._id}/${user._id}`),
          axiosClient.get(`/watch/status/${video._id}/${user._id}`),
          video?.uploader
            ? axiosClient.get(`/subscribe/status/${video.uploader}/${user._id}`)
            : Promise.resolve({ data: { subscribed: false, subscribers: 0 } }),
        ]);

        setIsLiked(Boolean(reactionRes.data?.liked));
        setIsDisliked(Boolean(reactionRes.data?.disliked));
        setIsWatchLater(Boolean(watchLaterRes.data?.watchlater));
        setIsSubscribed(Boolean(subscribeRes.data?.subscribed));
        if (typeof subscribeRes.data?.subscribers === "number") {
          setSubscriberCount(subscribeRes.data.subscribers);
        }
      } catch (e) {
        console.error("Failed to load video action status", e);
      }
    };

    loadStatus();
  }, [user?._id, video?._id, video?.uploader]);

  useEffect(() => {
    const handleviews = async () => {
      if (!video?._id) return;

      // Client-side idempotency guard to avoid duplicate rows due to re-renders.
      const key = `${String(user?._id || "guest")}:${String(video._id)}`;
      if (lastHistoryKeyRef.current === key) return;
      lastHistoryKeyRef.current = key;

      if (user) {
        try {
          return await axiosClient.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosClient.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user?._id, video?._id]);

  const applyReactionResponse = (payload: any) => {
    if (!payload || typeof payload !== "object") return;

    setIsLiked(Boolean(payload.liked));
    setIsDisliked(Boolean(payload.disliked));

    const nextLikes =
      typeof payload.likesCount === "number"
        ? payload.likesCount
        : typeof payload.likes === "number"
          ? payload.likes
          : typeof payload.videoLike === "number"
            ? payload.videoLike
            : undefined;

    const nextDislikes =
      typeof payload.dislikesCount === "number"
        ? payload.dislikesCount
        : typeof payload.dislikes === "number"
          ? payload.dislikes
          : typeof payload.videoDislike === "number"
            ? payload.videoDislike
            : undefined;

    if (typeof nextLikes === "number") setlikes(nextLikes);
    if (typeof nextDislikes === "number") setDislikes(nextDislikes);
  };

  const handleLike = async () => {
    if (!user) {
      notify.info("Sign in to like videos");
      return;
    }
    if (!video?._id) return;

    const prev = {
      likes,
      dislikes,
      isLiked,
      isDisliked,
    };

    // Optimistic UI
    if (isLiked) {
      setIsLiked(false);
      setlikes((n) => Math.max(0, n - 1));
    } else {
      setIsLiked(true);
      setlikes((n) => n + 1);
      if (isDisliked) {
        setIsDisliked(false);
        setDislikes((n) => Math.max(0, n - 1));
      }
    }

    try {
      const res = await axiosClient.post(`/like/${video._id}`, {
        userId: user?._id,
        type: "like",
      });

      applyReactionResponse(res.data);
    } catch (error) {
      console.error(error);
      setlikes(prev.likes);
      setDislikes(prev.dislikes);
      setIsLiked(prev.isLiked);
      setIsDisliked(prev.isDisliked);
      notify.error("Could not update like");
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      notify.info("Sign in to save videos");
      return;
    }

    const prev = isWatchLater;
    setIsWatchLater((v) => !v);
    try {
      const res = await axiosClient.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      setIsWatchLater(Boolean(res.data?.watchlater));
    } catch (error) {
      console.log(error);
      setIsWatchLater(prev);
      notify.error("Could not update Watch Later");
    }
  };

  const handleDislike = async () => {
    if (!user) {
      notify.info("Sign in to dislike videos");
      return;
    }
    if (!video?._id) return;

    const prev = {
      likes,
      dislikes,
      isLiked,
      isDisliked,
    };

    // Optimistic UI
    if (isDisliked) {
      setIsDisliked(false);
      setDislikes((n) => Math.max(0, n - 1));
    } else {
      setIsDisliked(true);
      setDislikes((n) => n + 1);
      if (isLiked) {
        setIsLiked(false);
        setlikes((n) => Math.max(0, n - 1));
      }
    }

    try {
      const res = await axiosClient.post(`/like/${video._id}`, {
        userId: user?._id,
        type: "dislike",
      });

      applyReactionResponse(res.data);
    } catch (error) {
      console.error(error);
      setlikes(prev.likes);
      setDislikes(prev.dislikes);
      setIsLiked(prev.isLiked);
      setIsDisliked(prev.isDisliked);
      notify.error("Could not update dislike");
    }
  };

  const parseStartAtSeconds = (value: string) => {
    const raw = String(value || "").trim();
    if (!raw) return undefined;
    const parts = raw.split(":").map((p) => p.trim());
    if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return undefined;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isFinite(n))) return undefined;
    if (nums.length === 1) {
      return nums[0];
    }
    if (nums.length === 2) {
      const [m, s] = nums;
      if (s > 59) return undefined;
      return m * 60 + s;
    }
    if (nums.length === 3) {
      const [h, m, s] = nums;
      if (m > 59 || s > 59) return undefined;
      return h * 3600 + m * 60 + s;
    }
    return undefined;
  };

  const buildShareUrl = (base: string, seconds?: number) => {
    try {
      const u = new URL(base);
      u.searchParams.delete("t");
      if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
        u.searchParams.set("t", String(Math.floor(seconds)));
      }
      return u.toString();
    } catch {
      return base;
    }
  };

  const currentStartAtSeconds = startAtEnabled
    ? parseStartAtSeconds(startAtTime)
    : undefined;
  const finalShareUrl = buildShareUrl(shareUrl || "", currentStartAtSeconds);

  const handleCopyShareLink = async () => {
    try {
      if (typeof window === "undefined") return;
      const url = finalShareUrl || shareUrl || window.location.href;

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify.success("Link copied");
        return;
      }

      // Fallback
      prompt("Copy this link:", url);
    } catch (e) {
      console.error(e);
      notify.error("Could not copy link");
    }
  };

  const openExternalShare = (href: string) => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const shareText = String(video?.videotitle || "").trim() || "Check this video";
  const encodedUrl = encodeURIComponent(finalShareUrl);
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${shareText} ${finalShareUrl}`
  )}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const xHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(
    shareText
  )}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(
    finalShareUrl
  )}`;

  const handleCopyEmbed = async () => {
    try {
      if (typeof window === "undefined") return;
      const url = finalShareUrl || shareUrl || window.location.href;
      const iframe = `<iframe width="560" height="315" src="${url}" title="${shareText.replace(
        /\"/g,
        "&quot;"
      )}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(iframe);
        notify.success("Embed code copied");
        return;
      }

      prompt("Copy embed code:", iframe);
    } catch (e) {
      console.error(e);
      notify.error("Could not copy embed code");
    }
  };

  const handleDownload = () => {
    const url = buildMediaUrl(video?.filepath);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubscribe = async () => {
    if (!user) {
      notify.info("Sign in to subscribe");
      return;
    }
    if (!video?.uploader) return;

    const prev = {
      isSubscribed,
      subscriberCount,
    };

    // Optimistic UI
    if (isSubscribed) {
      setIsSubscribed(false);
      setSubscriberCount((n) => Math.max(0, n - 1));
    } else {
      setIsSubscribed(true);
      setSubscriberCount((n) => n + 1);
    }

    try {
      const res = await axiosClient.post(`/subscribe/${video.uploader}`, {
        userId: user?._id,
      });
      setIsSubscribed(Boolean(res.data?.subscribed));
      if (typeof res.data?.subscribers === "number") {
        setSubscriberCount(res.data.subscribers);
      }
    } catch (e) {
      console.error(e);
      setIsSubscribed(prev.isSubscribed);
      setSubscriberCount(prev.subscriberCount);
      notify.error("Could not update subscription");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
          <Link href={video?.uploader ? `/channel/${video.uploader}` : "#"}>
            <Avatar className="w-10 h-10">
              <AvatarFallback>{video.videochanel?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link
              href={video?.uploader ? `/channel/${video.uploader}` : "#"}
              className="font-medium hover:underline"
            >
              {video.videochanel}
            </Link>
            <p className="text-sm text-muted-foreground">
              {subscriberCount.toLocaleString()} subscribers
            </p>
          </div>
          {video?.uploader && user?._id !== video?.uploader ? (
            <Button
              className="ml-4"
              variant={isSubscribed ? "secondary" : "default"}
              onClick={handleSubscribe}
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </Button>
          ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full bg-muted">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp className={`w-5 h-5 mr-2 ${isLiked ? "fill-current" : ""}`} />
              {Number(likes || 0).toLocaleString()}
            </Button>
            <div className="h-6 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown className={`w-5 h-5 mr-2 ${isDisliked ? "fill-current" : ""}`} />
              {Number(dislikes || 0).toLocaleString()}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn("rounded-full bg-muted", isWatchLater ? "text-primary" : "")}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch later"}
          </Button>

          <Dialog
            open={saveOpen}
            onOpenChange={(open) => {
              if (open) {
                if (!user?._id) {
                  notify.info("Sign in to save to playlists");
                  return;
                }
                setSaveOpen(true);
                void loadPlaylists();
                return;
              }
              setSaveOpen(false);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full bg-muted">
                <ListPlus className="w-5 h-5 mr-2" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save to playlist</DialogTitle>
              </DialogHeader>

              {playlistsLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : playlists.length === 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">No playlists yet.</div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/playlists">Create a playlist</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((p) => {
                    const checked = isVideoInPlaylist(p);
                    const busy = playlistBusyId && String(playlistBusyId) === String(p._id);
                    return (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => void togglePlaylist(String(p._id))}
                        disabled={Boolean(busy)}
                        className="flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/40 disabled:opacity-60"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {(Array.isArray(p.videos) ? p.videos.length : 0).toLocaleString()} videos
                            {p.visibility ? ` • ${p.visibility}` : ""}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="h-4 w-4 accent-red-600"
                        />
                      </button>
                    );
                  })}

                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/playlists">Manage playlists</Link>
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full bg-muted">
                <Share className="w-5 h-5 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Share</DialogTitle>
              </DialogHeader>

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Share in a post</div>
                <Button
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => notify.info("Create post is not available yet")}
                >
                  Create post
                </Button>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-start gap-4 overflow-x-auto pb-1">
                <button
                  type="button"
                  className="flex w-[72px] flex-col items-center gap-2"
                  disabled={!shareUrl}
                  onClick={handleCopyEmbed}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Code className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">Embed</span>
                </button>

                <button
                  type="button"
                  className="flex w-[72px] flex-col items-center gap-2"
                  disabled={!shareUrl}
                  onClick={() => openExternalShare(whatsappHref)}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Share className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                </button>

                <button
                  type="button"
                  className="flex w-[72px] flex-col items-center gap-2"
                  disabled={!shareUrl}
                  onClick={() => openExternalShare(facebookHref)}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Facebook className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">Facebook</span>
                </button>

                <button
                  type="button"
                  className="flex w-[72px] flex-col items-center gap-2"
                  disabled={!shareUrl}
                  onClick={() => openExternalShare(xHref)}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <X className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">X</span>
                </button>

                <button
                  type="button"
                  className="flex w-[72px] flex-col items-center gap-2"
                  disabled={!shareUrl}
                  onClick={() => openExternalShare(emailHref)}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Mail className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">Email</span>
                </button>

                <button
                  type="button"
                  className="flex w-[72px] flex-col items-center gap-2"
                  disabled={!shareUrl}
                  onClick={handleCopyShareLink}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Link2 className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">Copy</span>
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Input readOnly value={finalShareUrl} className="rounded-full" />
                <Button onClick={handleCopyShareLink} disabled={!shareUrl} className="rounded-full">
                  Copy
                </Button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  id="share-start-at"
                  type="checkbox"
                  checked={startAtEnabled}
                  onChange={(e) => setStartAtEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border border-input bg-background text-primary"
                />
                <label htmlFor="share-start-at" className="text-sm text-muted-foreground">
                  Start at
                </label>
                <Input
                  value={startAtTime}
                  onChange={(e) => setStartAtTime(e.target.value)}
                  disabled={!startAtEnabled}
                  className="h-9 w-24 rounded-full"
                  placeholder="0:00"
                />
                {startAtEnabled && typeof currentStartAtSeconds === "undefined" ? (
                  <span className="text-xs text-destructive">Use mm:ss</span>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full bg-muted"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-muted p-4">
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {Number(video?.views || 0).toLocaleString()} views
          </span>
          <span>•</span>
          <span>
            {video?.createdAt
              ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
              : ""}
          </span>
        </div>
        {String(video?.description || "").trim() ? (
          <>
            <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
              <p>{String(video?.description || "")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 p-0 h-auto font-medium"
              onClick={() => setShowFullDescription(!showFullDescription)}
            >
              {showFullDescription ? "Show less" : "Show more"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No description.</p>
        )}
      </div>
    </div>
  );
};

export default VideoInfo;