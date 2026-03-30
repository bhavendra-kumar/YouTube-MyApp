import { memo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Download } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { buildMediaUrl } from "@/lib/media";
import { useUser } from "@/context/AuthContext";
import { notify } from "@/services/toast";
import { requestVideoDownload, triggerBrowserDownload } from "@/services/downloads";

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
  const { user, updateUser } = useUser();
  const [downloading, setDownloading] = useState(false);

  const channel = video?.videochanel ?? "";
  const channelInitial = channel.trim().charAt(0).toUpperCase() || "?";

  const href = `/watch/${encodeURIComponent(String(video?._id ?? ""))}`;
  const title = video?.videotitle ?? "";
  const thumbnailSrc = buildMediaUrl(video?.thumbnailUrl);

  const viewsNumber =
    typeof video?.views === "number"
      ? video.views
      : Number.isFinite(Number(video?.views))
        ? Number(video?.views)
        : 0;

  const createdAt = dayjs(video?.createdAt);
  const timeAgo = createdAt.isValid() ? createdAt.fromNow() : "";

  const handleDownload = async () => {
    if (!video?._id) return;
    if (!user?._id) {
      notify.info("Sign in to download");
      return;
    }

    try {
      setDownloading(true);
      const data = await requestVideoDownload(String(video._id));
      const rawPath = String(data?.downloadUrl || data?.path || "").trim();
      if (!rawPath) {
        notify.error("Download URL unavailable");
        return;
      }

      const url = buildMediaUrl(rawPath);
      const filename = String(video?.videotitle || "video").trim() || "video";
      await triggerBrowserDownload(url, filename);

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

      if (status === 403 && typeof message === "string" && /upgrade|premium|download/i.test(message)) {
        notify.error(message);
        return;
      }

      notify.error(message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="group space-y-3">
      <Link href={href} className="block" aria-label={title || "Watch video"}>
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

          <div className="absolute top-2 right-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleDownload();
              }}
              disabled={downloading || !video?._id}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Downloading…" : "Download"}
            </Button>
          </div>

          {video?.duration ? (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
              {video.duration}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarFallback>{channelInitial}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Link href={href} className="block">
            <h3 className="line-clamp-2 text-sm font-medium">{title}</h3>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{channel}</p>
          <p className="text-sm text-muted-foreground">
            {viewsNumber.toLocaleString()} views{timeAgo ? ` • ${timeAgo}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

const VideoCard = memo(VideoCardInner);
export default VideoCard;