import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { buildMediaUrl } from "@/lib/media";

type Video = {
  _id?: string;
  filepath?: string;
  videochanel?: string;
  videotitle?: string;
  views?: number | string;
  createdAt?: string | number | Date;
  duration?: string;
};

export default function VideoCard({ video }: { video?: Video }) {
  const channel = video?.videochanel ?? "";
  const channelInitial = channel.trim().charAt(0).toUpperCase() || "?";

  const viewsNumber =
    typeof video?.views === "number"
      ? video.views
      : Number.isFinite(Number(video?.views))
        ? Number(video?.views)
        : 0;

  const createdAtDate = video?.createdAt ? new Date(video.createdAt) : undefined;
  const timeAgo =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? `${formatDistanceToNow(createdAtDate)} ago`
      : "";

  return (
    <Link href={`/watch/${video?._id ?? ""}`} className="group">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
          <video
            src={buildMediaUrl(video?.filepath)}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
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
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video?.videotitle}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{channel}</p>
            <p className="text-sm text-gray-600">
              {viewsNumber.toLocaleString()} views{timeAgo ? ` • ${timeAgo}` : ""}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}