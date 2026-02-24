import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button"
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { getSocket } from "@/lib/socket";
import { notify } from "@/services/toast";
import Link from "next/link";
import { buildMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState<number>(Number(video?.Like ?? 0));
  const [dislikes, setDislikes] = useState<number>(Number(video?.Dislike ?? 0));
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
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
  }, [video]);

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

  const handleShare = async () => {
    try {
      if (typeof window === "undefined") return;
      const url = window.location.href;

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
            {isWatchLater ? "Saved" : "Save"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full bg-muted"
            onClick={handleShare}
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
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