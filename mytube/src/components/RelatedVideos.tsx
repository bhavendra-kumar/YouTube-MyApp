import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { buildMediaUrl } from "@/lib/media";
import { uniqueById } from "@/lib/utils";

dayjs.extend(relativeTime);

function formatViews(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    filepath?: string;
    thumbnailUrl?: string;
    duration?: string;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  const uniqueVideos = uniqueById(videos);

  return (
    <div className="space-y-2">
      {uniqueVideos.map((video) => {
        const timeAgo = dayjs(video.createdAt).isValid()
          ? dayjs(video.createdAt).fromNow()
          : "";
        const thumbnailSrc = buildMediaUrl(video.thumbnailUrl);

        return (
          <Link
            key={video._id}
            href={`/watch/${video._id}`}
            className="group flex gap-2 p-1 rounded-xl hover:bg-accent/50 transition-colors"
          >
            {/* Thumbnail — exactly 168px wide, 16:9 */}
            <div
              className="relative shrink-0 overflow-hidden rounded-lg bg-muted"
              style={{ width: 168, aspectRatio: "16 / 9" }}
            >
              {thumbnailSrc ? (
                <img
                  src={thumbnailSrc}
                  alt={`${video.videotitle} thumbnail`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full" aria-hidden="true" />
              )}
              {/* Duration badge */}
              {video.duration && (
                <span className="yt-duration">{video.duration}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                {video.videotitle}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground truncate">{video.videochanel}</p>
              <p className="text-xs text-muted-foreground">
                {formatViews(video.views)}
                {timeAgo ? ` • ${timeAgo}` : ""}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}