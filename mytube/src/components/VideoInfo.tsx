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
import UpgradeToPremiumButton from "@/components/UpgradeToPremiumButton";
import { requestVideoDownload, triggerBrowserDownload } from "@/services/downloads";
import ShareModal from "@/components/ShareModal";
import SaveToPlaylistModal from "@/components/SaveToPlaylistModal";

const VideoInfo = ({ video, currentTimeSeconds }: any) => {
  const [likes, setlikes] = useState<number>(Number(video?.Like ?? 0));
  const [dislikes, setDislikes] = useState<number>(Number(video?.Dislike ?? 0));
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user, updateUser } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Array<any>>([]);
  const [playlistBusyId, setPlaylistBusyId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
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
    socket.on("dislike:updated", onDislikeUpdated);

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


  const handleDownload = async () => {
    if (!video?._id) return;
    if (!user?._id) {
      notify.info("Sign in to download");
      return;
    }

    try {
      setDownloading(true);
      notify.info("Starting download…");

      const data = await requestVideoDownload(String(video._id));
      const rawPath = String(data?.downloadUrl || data?.path || "").trim();
      if (!rawPath) {
        notify.error("Download URL unavailable");
        return;
      }

      const url = buildMediaUrl(rawPath);
      const filename = String(video?.videotitle || "video").trim() || "video";
      await triggerBrowserDownload(url, filename);

      // Keep UI counters responsive (backend enforces the real limit)
      const plan = String(user?.plan || "FREE").toUpperCase();
      const isPremiumUser = Boolean(user?.isPremium) || ["BRONZE", "SILVER", "GOLD", "PREMIUM"].includes(plan);
      if (!isPremiumUser) {
        updateUser({
          downloadsToday: (typeof user?.downloadsToday === "number" ? user.downloadsToday : 0) + 1,
          dailyDownloadCount: (typeof user?.dailyDownloadCount === "number" ? user.dailyDownloadCount : 0) + 1,
          lastDownloadDate: new Date().toISOString(),
        });
      }

      notify.success(data?.message || "Download started");
    } catch (e: any) {
      console.error(e);
      const status = e?.response?.status;
      const message = e?.response?.data?.message;

      if (status === 403 && typeof message === "string" && /download limit|upgrade/i.test(message)) {
        notify.error(message);
        setUpgradePromptOpen(true);
        return;
      }

      notify.error(message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const plan = String(user?.plan || "FREE").toUpperCase();
  const isPremiumUser = Boolean(user?.isPremium) || ["BRONZE", "SILVER", "GOLD", "PREMIUM"].includes(plan);
  const downloadsUsedToday = (() => {
    const last = user?.lastDownloadDate ? new Date(user.lastDownloadDate) : null;
    if (!last || Number.isNaN(last.getTime())) return 0;
    const sameLocalDay = new Date().toDateString() === last.toDateString();
    if (!sameLocalDay) return 0;
    const raw = typeof user?.downloadsToday === "number" ? user.downloadsToday : typeof user?.dailyDownloadCount === "number" ? user.dailyDownloadCount : 0;
    return Number.isFinite(raw) ? raw : 0;
  })();
  const remainingDownloadsToday = isPremiumUser ? null : Math.max(0, 1 - downloadsUsedToday);

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
    <div className="space-y-3">
      {/* Video title */}
      <h1 className="text-xl font-semibold leading-tight">{video.videotitle}</h1>

      {/* Channel + Subscribe row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={video?.uploader ? `/channel/${video.uploader}` : "#"}>
            <Avatar className="w-10 h-10">
              <AvatarFallback className="text-sm font-medium bg-primary/10">
                {video.videochanel?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link
              href={video?.uploader ? `/channel/${video.uploader}` : "#"}
              className="text-sm font-medium hover:text-foreground/80 transition-colors"
            >
              {video.videochanel}
            </Link>
            <p className="text-xs text-muted-foreground">
              {subscriberCount.toLocaleString()} subscribers
            </p>
          </div>
          {video?.uploader && user?._id !== video?.uploader ? (
            <button
              type="button"
              onClick={handleSubscribe}
              className={cn(
                "ml-2 h-9 px-4 rounded-full text-sm font-medium transition-colors",
                isSubscribed
                  ? "bg-secondary text-secondary-foreground hover:bg-muted-foreground hover:text-background"
                  : "bg-foreground text-background hover:bg-foreground/90"
              )}
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
          ) : null}
        </div>

        {/* Actions row — YouTube style */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Like / Dislike pill */}
          <div className="yt-action-pill">
            <button
              type="button"
              className="yt-action-pill-btn"
              onClick={handleLike}
              aria-label="Like"
            >
              <ThumbsUp className={cn("w-5 h-5", isLiked && "fill-current")} />
              <span>{Number(likes || 0).toLocaleString()}</span>
            </button>
            <div className="yt-action-pill-divider" />
            <button
              type="button"
              className="yt-action-pill-btn"
              onClick={handleDislike}
              aria-label="Dislike"
            >
              <ThumbsDown className={cn("w-5 h-5", isDisliked && "fill-current")} />
              <span className="sr-only">Dislike</span>
            </button>
          </div>

          {/* Share */}
          <button
            type="button"
            className="yt-action-btn"
            onClick={() => {
              setShareUrl(typeof window !== "undefined" ? window.location.href : "");
              setShareOpen(true);
            }}
          >
            <Share className="w-4 h-4" />
            Share
          </button>

          <ShareModal
            open={shareOpen}
            onOpenChange={setShareOpen}
            videoUrl={shareUrl || (typeof window !== "undefined" ? window.location.href : "")}
            videoTitle={video.videotitle}
            currentTimeSeconds={currentTimeSeconds}
          />

          {/* Download */}
          <button
            type="button"
            className="yt-action-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="w-4 h-4" />
            {downloading ? "Downloading…" : "Download"}
          </button>

          {/* Watch Later */}
          <button
            type="button"
            className={cn("yt-action-btn", isWatchLater && "text-foreground font-semibold")}
            onClick={handleWatchLater}
          >
            <Clock className="w-4 h-4" />
            {isWatchLater ? "Saved" : "Save"}
          </button>

          {/* Save to playlist */}
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
              <button type="button" className="yt-action-btn">
                <ListPlus className="w-4 h-4" />
                Save
              </button>
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

          <Dialog open={upgradePromptOpen} onOpenChange={setUpgradePromptOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upgrade to download more</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground">
                Free users can download 1 video per day. Upgrade to unlock unlimited downloads.
              </div>
              <div className="pt-2">
                <UpgradeToPremiumButton />
              </div>
            </DialogContent>
          </Dialog>

          <button type="button" className="yt-action-btn px-2">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Description box — YouTube's rounded dark bg */}
      <div className="rounded-xl bg-secondary p-3">
        {/* Views + date — shown at top of description like YouTube */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium mb-2">
          <span>{Number(video?.views || 0).toLocaleString()} views</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {video?.createdAt
              ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
              : ""}
          </span>
        </div>
        {String(video?.description || "").trim() ? (
          <>
            <div className={`text-sm leading-relaxed ${showFullDescription ? "" : "line-clamp-3"}`}>
              <p className="whitespace-pre-wrap">{String(video?.description || "")}</p>
            </div>
            <button
              type="button"
              className="mt-2 text-sm font-medium hover:text-muted-foreground transition-colors"
              onClick={() => setShowFullDescription(!showFullDescription)}
            >
              {showFullDescription ? "Show less" : "...more"}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No description.</p>
        )}
      </div>
    </div>
  );
};

export default VideoInfo;