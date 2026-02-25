import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import axiosClient from "@/services/http/axios";
import { buildMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/AuthContext";
import { notify } from "@/services/toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Facebook,
  Link2,
  Mail,
  MessageCircle,
  MoreVertical,
  Share2,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

type ShortItem = {
  _id: string;
  videotitle?: string;
  videochanel?: string;
  thumbnailUrl?: string;
  filepath?: string;
  sources?: Array<{ src: string; label: string; type?: string }>;
  views?: number;
  createdAt?: string;
  Like?: number;
  Dislike?: number;
  uploader?: string;
};

export default function ShortsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [items, setItems] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const wheelLockRef = useRef<number>(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axiosClient.get("/video/getall", {
          params: { page: 1, limit: 50, contentType: "short" },
        });

        const payload = res?.data?.data;
        const list = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

        if (!cancelled) setItems(list);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load shorts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Support deep-link: /shorts?v=<id>
  useEffect(() => {
    if (!router.isReady) return;
    const v = typeof router.query.v === "string" ? router.query.v : "";
    if (!v) return;
    const idx = items.findIndex((s) => String(s._id) === String(v));
    if (idx >= 0) setActiveIndex(idx);
  }, [items, router.isReady, router.query.v]);

  const active = items[activeIndex];

  useEffect(() => {
    const nextLikes = Number(active?.Like ?? 0);
    const nextDislikes = Number(active?.Dislike ?? 0);
    setLikes(nextLikes);
    setDislikes(nextDislikes);
    setIsLiked(false);
    setIsDisliked(false);
    setCommentCount(null);
    setIsSubscribed(false);
    setShareOpen(false);

    if (typeof window === "undefined") return;
    if (!active?._id) return;
    setShareUrl(`${window.location.origin}/watch/${active._id}`);
  }, [active?._id]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!active?._id) return;

      try {
        const [commentsRes, reactionRes, subStatusRes] = await Promise.all([
          axiosClient.get(`/comment/${active._id}`, {
            params: { page: 1, limit: 1 },
          }),
          user?._id
            ? axiosClient.get(`/like/status/${active._id}/${user._id}`)
            : Promise.resolve({ data: { liked: false, disliked: false } }),
          user?._id && active?.uploader
            ? axiosClient.get(`/subscribe/status/${active.uploader}/${user._id}`)
            : Promise.resolve({ data: { subscribed: false } }),
        ]);

        const total = commentsRes?.data?.data?.total;
        if (typeof total === "number") setCommentCount(total);
        else setCommentCount(null);

        setIsLiked(Boolean(reactionRes?.data?.liked));
        setIsDisliked(Boolean(reactionRes?.data?.disliked));
        setIsSubscribed(Boolean(subStatusRes?.data?.subscribed));
      } catch (e) {
        // Keep the Shorts player smooth; don't hard-fail on counts.
        console.error("Failed to load shorts action status", e);
      }
    };

    void loadStatus();
  }, [active?._id, active?.uploader, user?._id]);

  const activeSrc = useMemo(() => {
    if (!active) return "";
    const sources = Array.isArray(active.sources) ? active.sources : [];
    const best = sources.find((s) => Boolean(String(s?.src || "").trim()));
    return buildMediaUrl(best?.src || active.filepath || "");
  }, [active]);

  const activePoster = useMemo(() => {
    if (!active) return "/placeholder.svg?height=720&width=405";
    return active.thumbnailUrl
      ? buildMediaUrl(active.thumbnailUrl)
      : "/placeholder.svg?height=720&width=405";
  }, [active]);

  const goTo = (nextIndex: number) => {
    if (items.length === 0) return;
    const clamped = ((nextIndex % items.length) + items.length) % items.length;
    setActiveIndex(clamped);
    const id = items[clamped]?._id;
    if (id) {
      void router.replace(
        { pathname: "/shorts", query: { v: id } },
        undefined,
        { shallow: true }
      );
    }
  };

  const goNext = () => {
    if (items.length === 0) return;
    goTo(activeIndex + 1);
  };

  const goPrev = () => {
    if (items.length === 0) return;
    goTo(activeIndex - 1);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setIsPlaying(true);
    const tryPlay = async () => {
      try {
        await el.play();
      } catch {
        setIsPlaying(false);
      }
    };
    void tryPlay();
  }, [activeSrc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === " " || e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) {
          void el.play();
          setIsPlaying(true);
        } else {
          el.pause();
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now < wheelLockRef.current) return;
    if (Math.abs(e.deltaY) < 20) return;
    wheelLockRef.current = now + 450;
    if (e.deltaY > 0) goNext();
    else goPrev();
  };

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

    if (typeof nextLikes === "number") setLikes(nextLikes);
    if (typeof nextDislikes === "number") setDislikes(nextDislikes);
  };

  const handleLike = async () => {
    if (!user) {
      notify.info("Sign in to like shorts");
      return;
    }
    if (!active?._id) return;

    const prev = { likes, dislikes, isLiked, isDisliked };

    // Optimistic UI
    if (isLiked) {
      setIsLiked(false);
      setLikes((n) => Math.max(0, n - 1));
    } else {
      setIsLiked(true);
      setLikes((n) => n + 1);
      if (isDisliked) {
        setIsDisliked(false);
        setDislikes((n) => Math.max(0, n - 1));
      }
    }

    try {
      const res = await axiosClient.post(`/like/${active._id}`, {
        userId: user?._id,
        type: "like",
      });
      applyReactionResponse(res.data);
    } catch (e) {
      console.error(e);
      setLikes(prev.likes);
      setDislikes(prev.dislikes);
      setIsLiked(prev.isLiked);
      setIsDisliked(prev.isDisliked);
      notify.error("Could not update like");
    }
  };

  const handleDislike = async () => {
    if (!user) {
      notify.info("Sign in to dislike shorts");
      return;
    }
    if (!active?._id) return;

    const prev = { likes, dislikes, isLiked, isDisliked };

    // Optimistic UI
    if (isDisliked) {
      setIsDisliked(false);
      setDislikes((n) => Math.max(0, n - 1));
    } else {
      setIsDisliked(true);
      setDislikes((n) => n + 1);
      if (isLiked) {
        setIsLiked(false);
        setLikes((n) => Math.max(0, n - 1));
      }
    }

    try {
      const res = await axiosClient.post(`/like/${active._id}`, {
        userId: user?._id,
        type: "dislike",
      });
      applyReactionResponse(res.data);
    } catch (e) {
      console.error(e);
      setLikes(prev.likes);
      setDislikes(prev.dislikes);
      setIsLiked(prev.isLiked);
      setIsDisliked(prev.isDisliked);
      notify.error("Could not update dislike");
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      notify.info("Sign in to subscribe");
      return;
    }
    if (!active?.uploader) return;
    if (user?._id && String(user._id) === String(active.uploader)) return;

    const prev = { isSubscribed };

    // Optimistic UI
    setIsSubscribed((v) => !v);

    try {
      const res = await axiosClient.post(`/subscribe/${active.uploader}`, {
        userId: user?._id,
      });
      setIsSubscribed(Boolean(res.data?.subscribed));
    } catch (e) {
      console.error(e);
      setIsSubscribed(prev.isSubscribed);
      notify.error("Could not update subscription");
    }
  };

  const handleCopyShareLink = async () => {
    try {
      if (typeof window === "undefined") return;
      const url = shareUrl || window.location.href;

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify.success("Link copied");
        return;
      }

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

  const shareText = String(active?.videotitle || "").trim() || "Check this Short";
  const encodedUrl = encodeURIComponent(shareUrl);
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const xHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`;

  return (
    <main className="flex-1 bg-background">
      {loading ? (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
            Loading Shorts…
          </div>
        </div>
      ) : error ? (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 text-card-foreground">
            <div className="font-medium">Couldn’t load shorts</div>
            <div className="mt-1 text-sm text-muted-foreground">{error}</div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 text-card-foreground">
            <div className="font-medium">No shorts yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Upload a Short from Create → Upload short.
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-3xl items-center justify-center px-3 py-6">
          <div
            className={cn(
              "relative w-full max-w-[420px] overflow-hidden rounded-2xl border bg-black",
              "shadow-sm"
            )}
            onClick={togglePlay}
            onWheel={onWheel}
            onTouchStart={(e) => {
              touchStartYRef.current = e.touches?.[0]?.clientY ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchStartYRef.current;
              const end = e.changedTouches?.[0]?.clientY ?? null;
              touchStartYRef.current = null;
              if (start == null || end == null) return;
              const dy = end - start;
              if (Math.abs(dy) < 60) return;
              if (dy < 0) goNext();
              else goPrev();
            }}
          >
            <div className="relative aspect-[9/16] w-full">
              <video
                key={active?._id}
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                preload="metadata"
                poster={activePoster}
                src={activeSrc}
                onEnded={goNext}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Gradient overlay */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

              {/* Meta */}
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div
                  className="flex items-center justify-between gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {String(active?.videochanel || "?")?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{String(active?.videochanel || "")}</div>
                    </div>
                  </div>

                  {active?.uploader && user?._id !== active?.uploader ? (
                    <Button
                      size="sm"
                      variant={isSubscribed ? "secondary" : "default"}
                      className="h-8 rounded-full px-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSubscribe();
                      }}
                    >
                      {isSubscribed ? "Subscribed" : "Subscribe"}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-2 text-sm font-semibold line-clamp-2">
                  {String(active?.videotitle || "Untitled")}
                </div>
                <div className="mt-1 text-xs text-white/80">
                  {active?.views != null ? (
                    <span>{Number(active.views || 0).toLocaleString()} views</span>
                  ) : null}
                </div>
              </div>

              {/* Action rail */}
              <div
                className="absolute bottom-28 right-3 flex flex-col items-center gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleLike();
                  }}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white",
                      isLiked ? "ring-2 ring-white/40" : ""
                    )}
                  >
                    <ThumbsUp className={cn("h-6 w-6", isLiked ? "fill-current" : "")} />
                  </span>
                  <span className="text-[11px] text-white/90">{Number(likes || 0).toLocaleString()}</span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDislike();
                  }}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white",
                      isDisliked ? "ring-2 ring-white/40" : ""
                    )}
                  >
                    <ThumbsDown className={cn("h-6 w-6", isDisliked ? "fill-current" : "")} />
                  </span>
                  <span className="text-[11px] text-white/90">{Number(dislikes || 0).toLocaleString()}</span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!active?._id) return;
                    void router.push(`/watch/${active._id}#comments`);
                  }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white">
                    <MessageCircle className="h-6 w-6" />
                  </span>
                  <span className="text-[11px] text-white/90">
                    {commentCount == null ? "" : commentCount.toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareOpen(true);
                  }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white">
                    <Share2 className="h-6 w-6" />
                  </span>
                  <span className="text-[11px] text-white/90">Share</span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    notify.info("More options coming soon");
                  }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white">
                    <MoreVertical className="h-6 w-6" />
                  </span>
                  <span className="text-[11px] text-white/90">More</span>
                </button>
              </div>

              {/* Share dialog */}
              <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Share</DialogTitle>
                  </DialogHeader>

                  <div className="flex items-start gap-4 overflow-x-auto pb-1">
                    <button
                      type="button"
                      className="flex w-[72px] flex-col items-center gap-2"
                      disabled={!shareUrl}
                      onClick={() => openExternalShare(whatsappHref)}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                        <Share2 className="h-5 w-5" />
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
                    <Input readOnly value={shareUrl} className="rounded-full" />
                    <Button
                      onClick={handleCopyShareLink}
                      disabled={!shareUrl}
                      className="rounded-full"
                    >
                      Copy
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Simple play hint */}
              {!isPlaying ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 px-4 py-2 text-sm text-white">Paused</div>
                </div>
              ) : null}

              {/* Progress indicator */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-white/10">
                <div
                  className="w-full bg-white/60"
                  style={{ height: `${((activeIndex + 1) / items.length) * 100}%` }}
                />
              </div>

              {/* Swipe hint (first item) */}
              {activeIndex === 0 ? (
                <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
                  Swipe ↑/↓
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
