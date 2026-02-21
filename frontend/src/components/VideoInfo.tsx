import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import Link from "next/link";
import { buildMediaUrl } from "@/lib/media";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
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
          const countRes = await axiosInstance.get(
            `/subscribe/count/${video.uploader}`
          );
          setSubscriberCount(Number(countRes.data?.subscribers ?? 0));
        } else {
          setSubscriberCount(0);
        }

        if (!user?._id) return;

        const [reactionRes, watchLaterRes, subscribeRes] = await Promise.all([
          axiosInstance.get(`/like/status/${video._id}/${user._id}`),
          axiosInstance.get(`/watch/status/${video._id}/${user._id}`),
          video?.uploader
            ? axiosInstance.get(`/subscribe/status/${video.uploader}/${user._id}`)
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
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user, video?._id]);

  const handleLike = async () => {
    if (!user) {
      toast("Sign in to like videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
        type: "like",
      });

      setIsLiked(Boolean(res.data?.liked));
      setIsDisliked(Boolean(res.data?.disliked));
      if (typeof res.data?.likes === "number") setlikes(res.data.likes);
      if (typeof res.data?.dislikes === "number") setDislikes(res.data.dislikes);
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      toast("Sign in to save videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      setIsWatchLater(Boolean(res.data?.watchlater));
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast("Sign in to dislike videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
        type: "dislike",
      });

      setIsLiked(Boolean(res.data?.liked));
      setIsDisliked(Boolean(res.data?.disliked));
      if (typeof res.data?.likes === "number") setlikes(res.data.likes);
      if (typeof res.data?.dislikes === "number") setDislikes(res.data.dislikes);
    } catch (error) {
      console.log(error);
    }
  };

  const handleShare = async () => {
    try {
      if (typeof window === "undefined") return;
      const url = window.location.href;

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
        return;
      }

      // Fallback
      prompt("Copy this link:", url);
    } catch (e) {
      console.error(e);
      toast("Could not copy link");
    }
  };

  const handleDownload = () => {
    const url = buildMediaUrl(video?.filepath);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast("Sign in to subscribe");
      return;
    }
    if (!video?.uploader) return;

    try {
      const res = await axiosInstance.post(`/subscribe/${video.uploader}`, {
        userId: user?._id,
      });
      setIsSubscribed(Boolean(res.data?.subscribed));
      if (typeof res.data?.subscribers === "number") {
        setSubscriberCount(res.data.subscribers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={video?.uploader ? `/channel/${video.uploader}` : "#"}>
            <Avatar className="w-10 h-10">
              <AvatarFallback>{video.videochanel?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={video?.uploader ? `/channel/${video.uploader}` : "#"}
              className="font-medium hover:underline"
            >
              {video.videochanel}
            </Link>
            <p className="text-sm text-gray-600">
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
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
            onClick={handleShare}
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;