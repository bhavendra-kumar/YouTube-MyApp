import { memo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  MoreVertical,
  Clock,
  BookmarkPlus,
  Share2,
  ThumbsDown,
  Flag,
  BadgeCheck,
  Download,
  ListPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { buildMediaUrl } from "@/lib/media";
import { useUser } from "@/context/AuthContext";
import { notify } from "@/services/toast";
import { requestVideoDownload, triggerBrowserDownload } from "@/services/downloads";
import axiosClient from "@/services/http/axios";
import ShareModal from "@/components/ShareModal";
import SaveToPlaylistModal from "@/components/SaveToPlaylistModal";

dayjs.extend(relativeTime);

export type VideoData = {
  _id?: string;
  filepath?: string;
  thumbnailUrl?: string;
  videochanel?: string;
  videotitle?: string;
  views?: number | string;
  createdAt?: string | number | Date;
  duration?: string;
  uploader?: string;
  isVerified?: boolean;
  category?: string;
  contentType?: string;
};

type Props = {
  video?: VideoData;
  layout?: "grid" | "list";
};

function formatViews(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

function VideoCardInner({ video, layout = "grid" }: Props) {
  const { user, updateUser } = useUser();
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [savePlaylistOpen, setSavePlaylistOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
  const isVerified = video?.isVerified ?? false;

  const handleDownload = useCallback(async () => {
    if (!video?._id) return;
    if (!user?._id) { notify.info("Sign in to download"); return; }
    try {
      setDownloading(true);
      const data = await requestVideoDownload(String(video._id));
      const rawPath = String(data?.downloadUrl || data?.path || "").trim();
      if (!rawPath) { notify.error("Download URL unavailable"); return; }
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
      const status = e?.response?.status;
      const message = e?.response?.data?.message;
      if (status === 403 && typeof message === "string" && /upgrade|premium|download/i.test(message)) {
        notify.error(message); return;
      }
      notify.error(message || "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [video, user, updateUser]);

  const handleSaveWatchLater = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user?._id) { notify.info("Sign in to save videos"); return; }
    if (!video?._id) return;
    try {
      await axiosClient.post("/watchlater/add", { videoid: video._id });
      setSaved(true);
      notify.success("Saved to Watch Later");
    } catch {
      notify.error("Failed to save");
    }
    setMenuOpen(false);
  }, [user, video]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setShareModalOpen(true);
    setMenuOpen(false);
  }, []);

  const handleSaveToPlaylist = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSavePlaylistOpen(true);
    setMenuOpen(false);
  }, []);

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setMenuOpen(prev => !prev);
  }, []);

  if (layout === "list") {
    return (
      <div className="group flex gap-4 py-3 px-2 rounded-xl hover:bg-accent/40 transition-colors">
        {/* Thumbnail */}
        <Link href={href} className="relative shrink-0 w-40 aspect-video rounded-lg overflow-hidden bg-muted sm:w-56 md:w-64">
          {thumbnailSrc ? (
            <img src={thumbnailSrc} alt={title} loading="lazy" decoding="async"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          {video?.duration && <span className="yt-duration">{video.duration}</span>}
        </Link>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={href}>
            <h3 className="line-clamp-2 text-sm font-medium leading-snug mb-1">{title}</h3>
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <span>{channel}</span>
            {isVerified && <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground fill-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatViews(viewsNumber)}{timeAgo ? ` • ${timeAgo}` : ""}
          </p>
        </div>
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div className="group relative space-y-3">
      {/* Thumbnail container */}
      <Link href={href} className="block" aria-label={title || "Watch video"}>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={title ? `${title} thumbnail` : "Video thumbnail"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}

          {/* Duration badge */}
          {video?.duration && (
            <span className="yt-duration">{video.duration}</span>
          )}

          {/* Watch Later button — appears on thumbnail hover, top-right */}
          <button
            type="button"
            onClick={handleSaveWatchLater}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/95"
            aria-label="Save to Watch Later"
            title="Save to Watch Later"
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>
      </Link>

      {/* Card info row */}
      <div className="flex gap-3 pr-2">
        {/* Channel avatar */}
        <Link href={`/channel/${encodeURIComponent(String(video?.uploader ?? ""))}`}
          className="shrink-0 mt-0.5" tabIndex={-1}>
          <Avatar className="w-9 h-9">
            <AvatarFallback className="text-sm font-medium bg-primary/10">
              {channelInitial}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Text info */}
        <div className="flex-1 min-w-0">
          <Link href={href} className="block">
            <h3 className="line-clamp-2 text-base font-medium leading-[22px]">
              {title}
            </h3>
          </Link>
          <div className="mt-1 flex items-center gap-1">
            <p className="text-sm text-muted-foreground truncate">{channel}</p>
            {isVerified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatViews(viewsNumber)}
            {timeAgo ? ` • ${timeAgo}` : ""}
          </p>
        </div>

        {/* 3-dot menu — visible on group hover */}
        <div className="relative shrink-0 yt-video-menu" ref={menuRef}>
          <button
            type="button"
            onClick={toggleMenu}
            className="p-1.5 rounded-full hover:bg-muted transition-colors -mr-1"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              {/* Menu */}
              <div
                className="absolute right-0 top-8 z-50 min-w-52 rounded-2xl border bg-popover shadow-xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={handleSaveWatchLater}
                >
                  <Clock className="h-4 w-4" />
                  {saved ? "Saved to Watch Later" : "Save to Watch Later"}
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    void handleDownload();
                    setMenuOpen(false);
                  }}
                  disabled={downloading}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Downloading…" : "Download"}
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={handleSaveToPlaylist}
                >
                  <ListPlus className="h-4 w-4" />
                  Save to playlist
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-muted-foreground"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); notify.info("Feedback noted"); }}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Not interested
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-muted-foreground"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); notify.info("Reported"); }}
                >
                  <Flag className="h-4 w-4" />
                  Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const VideoCard = memo(VideoCardInner);
export default VideoCard;