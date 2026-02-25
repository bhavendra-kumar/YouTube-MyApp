import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import axiosClient from "@/services/http/axios";
import { buildMediaUrl } from "@/lib/media";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSocket } from "@/lib/socket";
import { useUser } from "@/context/AuthContext";

type ShortItem = {
  _id: string;
  filepath?: string;
  videotitle?: string;
  thumbnailUrl?: string;
  videochanel?: string;
  Like?: number;
  Dislike?: number;
  commentsCount?: number;
};

type CommentItem = {
  _id: string;
  videoid: string;
  userid?: string;
  commentbody?: string;
  usercommented?: string;
  createdAt?: string;
};

type HeartBurst = {
  key: string;
  x: number;
  y: number;
};

function formatCount(n?: number) {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getShareUrl(videoId: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/watch/${encodeURIComponent(videoId)}`;
}

export default function ShortsPage() {
  const { user } = useUser();

  const [items, setItems] = useState<ShortItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [disliked, setDisliked] = useState<Set<string>>(new Set());
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [shareOpenFor, setShareOpenFor] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareCopied, setShareCopied] = useState(false);

  const [commentsByVideo, setCommentsByVideo] = useState<Record<string, CommentItem[]>>({});
  const [commentInput, setCommentInput] = useState<string>("");
  const [commentPosting, setCommentPosting] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  const [heartBurstsByVideo, setHeartBurstsByVideo] = useState<Record<string, HeartBurst[]>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const scrollLockRef = useRef(false);
  const watchtimeSentRef = useRef<Set<string>>(new Set());
  const prevActiveIdRef = useRef<string | null>(null);

  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(Boolean(mql.matches));
    update();
    try {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    } catch {
      const legacy = mql as unknown as {
        addListener: (cb: () => void) => void;
        removeListener: (cb: () => void) => void;
      };
      legacy.addListener(update);
      return () => legacy.removeListener(update);
    }
  }, []);

  const loadShorts = async (pageNum = 1) => {
    const res = await axiosClient.get("/video/shorts", {
      params: { page: pageNum, limit: 10 },
    });

    const list = safeArray<ShortItem>(res.data?.data);

    if (pageNum === 1) {
      setItems(list);
    } else {
      setItems((prev) => {
        const seen = new Set(prev.map((v) => String(v._id)));
        const next = [...prev];
        for (const v of list) {
          const id = String(v?._id || "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          next.push(v);
        }
        return next;
      });
    }

    if (list.length < 10) setHasMore(false);
  };

  useEffect(() => {
    loadShorts(1);
  }, []);

  const ids = useMemo(() => items.map((i) => i._id), [items]);

  // Remember last watched
  useEffect(() => {
    const saved = localStorage.getItem("lastShort");
    if (saved) setActiveId(saved);
    else if (ids.length) setActiveId(ids[0]);
  }, [ids]);

  // Auto play logic
  useEffect(() => {
    if (!activeId) return;

    // Pause everything except the active short.
    for (const [id, video] of videoRefs.current.entries()) {
      if (!video) continue;
      if (id !== activeId) video.pause();
    }

    const activeVideo = videoRefs.current.get(activeId);
    activeVideo?.play().catch(() => {});
    localStorage.setItem("lastShort", activeId);

    const index = ids.indexOf(activeId);

    // preload next
    const nextId = ids[index + 1];
    if (nextId) {
      const nextVideo = videoRefs.current.get(nextId);
      nextVideo?.load();
    }

    // infinite load
    if (index >= ids.length - 2 && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadShorts(nextPage);
    }

    prevActiveIdRef.current = activeId;
  }, [activeId, hasMore, ids, page]);

  // Intersection observer
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const id = visible.target.getAttribute("data-id");
          if (id) setActiveId(id);
        }
      },
      { root, threshold: 0.7 }
    );

    const sections = root.querySelectorAll("[data-id]");
    sections.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [items]);

  const toggleLike = async (id: string) => {
    // Optimistic UI
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDisliked((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      const res = await axiosClient.post(`/like/${encodeURIComponent(id)}`, { type: "like" });
      const likesCount = Number(res.data?.likesCount ?? res.data?.likes);
      const dislikesCount = Number(res.data?.dislikesCount ?? res.data?.dislikes);
      const serverLiked = Boolean(res.data?.liked);
      const serverDisliked = Boolean(res.data?.disliked);

      setLiked((prev) => {
        const next = new Set(prev);
        if (serverLiked) next.add(id);
        else next.delete(id);
        return next;
      });
      setDisliked((prev) => {
        const next = new Set(prev);
        if (serverDisliked) next.add(id);
        else next.delete(id);
        return next;
      });

      setItems((prev) =>
        prev.map((v) =>
          String(v._id) === String(id)
            ? {
                ...v,
                Like: Number.isFinite(likesCount) ? likesCount : v.Like,
                Dislike: Number.isFinite(dislikesCount) ? dislikesCount : v.Dislike,
              }
            : v
        )
      );
    } catch {
      // If auth fails, just keep UI best-effort.
    }
  };

  const toggleDislike = async (id: string) => {
    setDisliked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLiked((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      const res = await axiosClient.post(`/like/${encodeURIComponent(id)}`, { type: "dislike" });
      const likesCount = Number(res.data?.likesCount ?? res.data?.likes);
      const dislikesCount = Number(res.data?.dislikesCount ?? res.data?.dislikes);
      const serverLiked = Boolean(res.data?.liked);
      const serverDisliked = Boolean(res.data?.disliked);

      setLiked((prev) => {
        const next = new Set(prev);
        if (serverLiked) next.add(id);
        else next.delete(id);
        return next;
      });
      setDisliked((prev) => {
        const next = new Set(prev);
        if (serverDisliked) next.add(id);
        else next.delete(id);
        return next;
      });

      setItems((prev) =>
        prev.map((v) =>
          String(v._id) === String(id)
            ? {
                ...v,
                Like: Number.isFinite(likesCount) ? likesCount : v.Like,
                Dislike: Number.isFinite(dislikesCount) ? dislikesCount : v.Dislike,
              }
            : v
        )
      );
    } catch {
      // ignore
    }
  };

  const addHeartBurst = (videoId: string, x: number, y: number) => {
    const key = `${videoId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    const burst: HeartBurst = { key, x, y };
    setHeartBurstsByVideo((prev) => ({
      ...prev,
      [videoId]: [...(prev[videoId] || []), burst],
    }));

    window.setTimeout(() => {
      setHeartBurstsByVideo((prev) => {
        const nextList = (prev[videoId] || []).filter((b) => b.key !== key);
        return { ...prev, [videoId]: nextList };
      });
    }, 700);
  };

  const onVideoPointerDown = (videoId: string) => (e: React.PointerEvent) => {
    const now = Date.now();
    const x = e.clientX;
    const y = e.clientY;
    const last = lastTapRef.current;

    lastTapRef.current = { time: now, x, y };

    if (!last) return;
    const dt = now - last.time;
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.hypot(dx, dy);

    if (dt > 320 || dist > 48) return;

    const section = sectionRefs.current.get(videoId);
    if (section) {
      const rect = section.getBoundingClientRect();
      const relX = x - rect.left;
      const relY = y - rect.top;
      addHeartBurst(videoId, relX, relY);
    } else {
      addHeartBurst(videoId, 210, 320);
    }

    void toggleLike(videoId);
  };

  const scrollToVideo = (videoId: string) => {
    const el = sectionRefs.current.get(videoId);
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // ignore
    }
  };

  const scrollRelative = (direction: -1 | 1) => {
    if (scrollLockRef.current) return;
    if (!activeId) return;
    const index = ids.indexOf(activeId);
    if (index < 0) return;

    const nextIndex = index + direction;
    const nextId = ids[nextIndex];
    if (!nextId) return;

    scrollLockRef.current = true;
    scrollToVideo(nextId);
    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 450);
  };

  const onContainerWheel = (e: React.WheelEvent) => {
    if (isCoarsePointer) return;
    if (Math.abs(e.deltaY) < 40) return;
    e.preventDefault();
    scrollRelative(e.deltaY > 0 ? 1 : -1);
  };

  const onContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      scrollRelative(1);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      scrollRelative(-1);
      return;
    }
    if (e.key === " " || e.key === "Spacebar") {
      // Toggle play/pause
      e.preventDefault();
      if (!activeId) return;
      const video = videoRefs.current.get(activeId);
      if (!video) return;
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    }
    if (e.key === "Escape") {
      setOpenComments(null);
      setShareOpenFor(null);
    }
  };

  useEffect(() => {
    if (!openComments) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpenComments(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openComments]);

  useEffect(() => {
    if (!shareOpenFor) {
      setShareCopied(false);
      setShareUrl("");
      return;
    }
    setShareCopied(false);
    setShareUrl(getShareUrl(shareOpenFor));
  }, [shareOpenFor]);

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const nativeShare = async () => {
    if (!shareUrl) return;
    if (typeof navigator.share !== "function") return;
    try {
      await navigator.share({ url: shareUrl });
    } catch {
      // ignore
    }
  };

  const loadComments = async (videoId: string) => {
    setCommentLoading(true);
    try {
      const res = await axiosClient.get(`/comment/${encodeURIComponent(videoId)}`, {
        params: { page: 1, limit: 30 },
      });
      const items = safeArray<CommentItem>(res.data?.items);
      // Backend returns newest first; keep that.
      setCommentsByVideo((prev) => ({ ...prev, [videoId]: items }));
    } catch {
      setCommentsByVideo((prev) => ({ ...prev, [videoId]: prev[videoId] || [] }));
    } finally {
      setCommentLoading(false);
    }
  };

  const postComment = async () => {
    const videoId = openComments;
    const body = commentInput.trim();
    if (!videoId || body.length === 0) return;
    if (!user) return;

    setCommentPosting(true);
    try {
      const res = await axiosClient.post("/comment/postcomment", {
        videoid: videoId,
        commentbody: body,
        usercommented: user?.name || user?.channelname || "",
      });
      const created = (res.data?.data || res.data) as CommentItem | undefined;
      if (created && created._id) {
        setCommentsByVideo((prev) => ({
          ...prev,
          [videoId]: [created, ...(prev[videoId] || [])],
        }));
        setItems((prev) =>
          prev.map((v) =>
            String(v._id) === String(videoId)
              ? { ...v, commentsCount: Number(v.commentsCount || 0) + 1 }
              : v
          )
        );
      }
      setCommentInput("");
    } catch {
      // ignore
    } finally {
      setCommentPosting(false);
    }
  };

  // Real-time comments via Socket.IO while sheet is open
  useEffect(() => {
    const videoId = openComments;
    if (!videoId) return;

    void loadComments(videoId);

    const socket = getSocket();
    try {
      if (!socket.connected) socket.connect();
      socket.emit("video:join", videoId);
    } catch {
      // ignore
    }

    const onNew = (comment: CommentItem) => {
      if (!comment || String(comment.videoid) !== String(videoId)) return;
      setCommentsByVideo((prev) => {
        const list = prev[videoId] || [];
        if (list.some((c) => String(c._id) === String(comment._id))) return prev;
        return { ...prev, [videoId]: [comment, ...list] };
      });
      setItems((prev) =>
        prev.map((v) =>
          String(v._id) === String(videoId)
            ? { ...v, commentsCount: Number(v.commentsCount || 0) + 1 }
            : v
        )
      );
    };

    const onUpdated = (comment: CommentItem) => {
      if (!comment || String(comment.videoid) !== String(videoId)) return;
      setCommentsByVideo((prev) => ({
        ...prev,
        [videoId]: (prev[videoId] || []).map((c) =>
          String(c._id) === String(comment._id) ? { ...c, ...comment } : c
        ),
      }));
    };

    const onDeleted = (payload: { _id: string; videoid: string }) => {
      if (!payload || String(payload.videoid) !== String(videoId)) return;
      setCommentsByVideo((prev) => ({
        ...prev,
        [videoId]: (prev[videoId] || []).filter((c) => String(c._id) !== String(payload._id)),
      }));
      setItems((prev) =>
        prev.map((v) =>
          String(v._id) === String(videoId)
            ? { ...v, commentsCount: Math.max(0, Number(v.commentsCount || 0) - 1) }
            : v
        )
      );
    };

    socket.on("comment:new", onNew);
    socket.on("comment:updated", onUpdated);
    socket.on("comment:deleted", onDeleted);

    return () => {
      try {
        socket.emit("video:leave", videoId);
      } catch {
        // ignore
      }
      socket.off("comment:new", onNew);
      socket.off("comment:updated", onUpdated);
      socket.off("comment:deleted", onDeleted);
    };
  }, [openComments, user]);

  return (
    <main className="flex-1 bg-black text-white">
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label="Shorts feed"
        onKeyDown={onContainerKeyDown}
        className="h-[calc(100dvh-56px-var(--yt-bottom-nav-h))] md:h-[calc(100dvh-56px)] overflow-y-auto snap-y snap-mandatory scroll-smooth overscroll-y-contain [-webkit-overflow-scrolling:touch] focus:outline-none"
        onWheel={onContainerWheel}
      >
        {items.map((item) => {
          const id = item._id;
          const src = buildMediaUrl(item.filepath || "");

          return (
            <section
              key={id}
              data-id={id}
              ref={(el) => {
                if (el) sectionRefs.current.set(id, el);
                else sectionRefs.current.delete(id);
              }}
              className="h-[calc(100dvh-56px-var(--yt-bottom-nav-h))] md:h-[calc(100dvh-56px)] snap-start flex items-center justify-center p-3 [scroll-snap-stop:always]"
            >
              <div className="relative aspect-[9/16] h-full max-h-[calc(100dvh-56px-var(--yt-bottom-nav-h)-24px)] md:max-h-[calc(100dvh-56px-24px)] w-full max-w-[420px] overflow-hidden rounded-2xl bg-black">

                {/* VIDEO */}
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(id, el);
                    else videoRefs.current.delete(id);
                  }}
                  src={src}
                  poster={item.thumbnailUrl}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  className="h-full w-full object-cover [touch-action:pan-y]"
                  onPointerDown={onVideoPointerDown(id)}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    if (video.currentTime <= 3) return;
                    if (watchtimeSentRef.current.has(id)) return;
                    watchtimeSentRef.current.add(id);
                    axiosClient
                      .post("/video/watchtime", {
                        videoId: id,
                        watchedSeconds: video.currentTime,
                      })
                      .catch(() => {});
                  }}
                />

                {/* Heart burst animation */}
                <div className="pointer-events-none absolute inset-0">
                  {(heartBurstsByVideo[id] || []).map((b) => (
                    <div
                      key={b.key}
                      className="absolute"
                      style={{ left: b.x, top: b.y }}
                    >
                      <div className="heart-pop text-white drop-shadow">
                        <Heart className="h-16 w-16 fill-white" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                {/* Top bar */}
                <div className="absolute top-3 left-3 right-3 flex justify-between text-white">
                  <div className="bg-black/60 px-3 py-1 rounded-full text-xs">
                    Shorts
                  </div>
                  <MoreVertical />
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom)+var(--yt-bottom-nav-h))] md:bottom-4 left-4 right-16 text-white">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-white/10 text-white">
                        {item.videochanel?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">
                      {item.videochanel}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      aria-label={subscribed.has(id) ? "Subscribed" : "Subscribe"}
                      onClick={() =>
                        setSubscribed((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                    >
                      {subscribed.has(id) ? "Subscribed" : "Subscribe"}
                    </Button>
                  </div>

                  <div className="mt-2 text-sm font-semibold line-clamp-2">
                    {item.videotitle}
                  </div>
                </div>

                {/* Action Rail */}
                <div className="absolute right-3 bottom-[calc(5rem+env(safe-area-inset-bottom)+var(--yt-bottom-nav-h))] md:bottom-20 flex flex-col items-center gap-4 text-white">
                  <button aria-label="Like" onClick={() => toggleLike(id)}>
                    <ThumbsUp
                      className={`h-6 w-6 ${
                        liked.has(id)
                          ? "text-primary fill-primary"
                          : ""
                      }`}
                    />
                    <div className="text-xs">
                      {formatCount(item.Like)}
                    </div>
                  </button>

                  <button aria-label="Dislike" onClick={() => toggleDislike(id)}>
                    <ThumbsDown
                      className={`h-6 w-6 ${
                        disliked.has(id) ? "text-primary fill-primary" : ""
                      }`}
                    />
                    <div className="text-xs">
                      {formatCount(item.Dislike)}
                    </div>
                  </button>

                  <button aria-label="Comments" onClick={() => setOpenComments(id)}>
                    <MessageCircle className="h-6 w-6" />
                    <div className="text-xs">
                      {formatCount(item.commentsCount)}
                    </div>
                  </button>

                  <button aria-label="Share" onClick={() => setShareOpenFor(id)}>
                    <Share className="h-6 w-6" />
                    <div className="text-xs">Share</div>
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Comments Bottom Sheet */}
      {openComments && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" role="dialog" aria-modal="true" aria-label="Comments">
          <div className="w-full h-[70vh] overflow-y-auto rounded-t-2xl bg-background p-4 text-foreground">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Comments</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpenComments(null)}>
                Close
              </Button>
            </div>

            {!user ? (
              <div className="mb-4 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
                Sign in to comment.
              </div>
            ) : (
              <div className="mb-4 space-y-2">
                <Textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment…"
                  className="min-h-[84px]"
                />
                <div className="flex justify-end">
                  <Button type="button" disabled={commentPosting || commentInput.trim().length === 0} onClick={postComment}>
                    {commentPosting ? "Posting…" : "Post"}
                  </Button>
                </div>
              </div>
            )}

            {commentLoading ? (
              <div className="text-sm text-muted-foreground">Loading comments…</div>
            ) : (
              <div className="space-y-3">
                {(commentsByVideo[openComments] || []).map((c) => (
                  <div key={c._id} className="rounded-lg border bg-card p-3">
                    <div className="text-sm font-medium">
                      {c.usercommented || "User"}
                    </div>
                    <div className="mt-1 text-sm text-foreground/90">{c.commentbody || ""}</div>
                  </div>
                ))}
                {(commentsByVideo[openComments] || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No comments yet.</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share modal */}
      <Dialog open={Boolean(shareOpenFor)} onOpenChange={(open) => setShareOpenFor(open ? shareOpenFor : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share</DialogTitle>
            <DialogDescription>Copy the link or share using your device.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input readOnly value={shareUrl} placeholder="Generating link…" />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={copyShareUrl} disabled={!shareUrl}>
                {shareCopied ? "Copied" : "Copy link"}
              </Button>
              <Button
                type="button"
                onClick={nativeShare}
                disabled={!shareUrl || typeof window === "undefined" || typeof (navigator as any).share !== "function"}
              >
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .heart-pop {
          position: relative;
          transform: translate(-50%, -50%) scale(0.4);
          opacity: 0;
          animation: heart-pop 700ms ease-out forwards;
        }

        @keyframes heart-pop {
          0% {
            transform: translate(-50%, -50%) scale(0.4);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.35);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}
