import Link from "next/link";
import { formatDistanceToNow } from "date-fns"
import { buildMediaUrl } from "@/lib/media";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    filepath?: string;
    thumbnailUrl?: string;
  }>;
}
export default function RelatedVideos({ videos }: RelatedVideosProps) {
  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <Link
          key={video._id}
          href={`/watch/${video._id}`}
          className="group -m-1 flex gap-3 rounded-lg p-1 transition-colors hover:bg-accent/40"
        >
          <div className="relative aspect-video w-44 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            {video.thumbnailUrl ? (
              <img
                src={buildMediaUrl(video.thumbnailUrl)}
                alt={`${video.videotitle} thumbnail`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="line-clamp-2 text-sm font-medium">
              {video.videotitle}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{video.videochanel}</p>
            <p className="text-xs text-muted-foreground">
              {video.views.toLocaleString()} views •{" "}
              {formatDistanceToNow(new Date(video.createdAt))} ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}