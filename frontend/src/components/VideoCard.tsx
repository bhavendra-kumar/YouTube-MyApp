import { memo } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Avatar, AvatarFallback } from "./ui/avatar";

dayjs.extend(relativeTime);

type Video = {
  _id?: string;
  filepath?: string;
  thumbnailUrl?: string;
  videochanel?: string;
  videotitle?: string;
  views?: number | string;
  createdAt?: string | number | Date;
  duration?: string;
};

type Props = {
  video?: Video;
};

function VideoCardInner({ video }: Props) {
  const channel = video?.videochanel ?? "";
  const channelInitial = channel.trim().charAt(0).toUpperCase() || "?";

  const href = `/watch/${encodeURIComponent(String(video?._id ?? ""))}`;
  const title = video?.videotitle ?? "";
  const thumbnailSrc = String(video?.thumbnailUrl || "");

  const viewsNumber =
    typeof video?.views === "number"
      ? video.views
      : Number.isFinite(Number(video?.views))
        ? Number(video?.views)
        : 0;

  const createdAt = dayjs(video?.createdAt);
  const timeAgo = createdAt.isValid() ? createdAt.fromNow() : "";

  return (
    <Link href={href} className="group" aria-label={title || "Watch video"}>
      <div className="space-y-3">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={title ? `${title} thumbnail` : "Video thumbnail"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="h-full w-full" aria-hidden="true" />
          )}
          {video?.duration ? (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
              {video.duration}
            </div>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback>{channelInitial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="line-clamp-2 text-sm font-medium">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{channel}</p>
            <p className="text-sm text-muted-foreground">
              {viewsNumber.toLocaleString()} views{timeAgo ? ` • ${timeAgo}` : ""}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

const VideoCard = memo(VideoCardInner);
export default VideoCard;