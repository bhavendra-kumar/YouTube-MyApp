import Head from "next/head";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import axiosClient from "@/services/http/axios";
import { buildMediaUrl } from "@/lib/media";

dayjs.extend(relativeTime);

const TREND_TABS = ["Now", "Music", "Gaming", "Movies"] as const;
type TrendTab = typeof TREND_TABS[number];

const CATEGORY_MAP: Record<TrendTab, string | undefined> = {
  Now: undefined,
  Music: "Music",
  Gaming: "Gaming",
  Movies: "Movies",
};

type Video = {
  _id: string;
  videotitle?: string;
  videochanel?: string;
  thumbnailUrl?: string;
  filepath?: string;
  views?: number;
  createdAt?: string;
  duration?: string;
  uploader?: string;
  Like?: number;
};

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function VideoSkeleton() {
  return (
    <div className="flex gap-4 py-4 animate-pulse">
      <div className="hidden sm:block w-8 text-muted-foreground text-lg font-light text-right shrink-0 pt-2">&nbsp;</div>
      <div className="relative aspect-video w-40 sm:w-48 md:w-64 rounded-xl yt-skeleton shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 yt-skeleton rounded w-3/4" />
        <div className="h-4 yt-skeleton rounded w-1/2" />
        <div className="h-3 yt-skeleton rounded w-1/3" />
        <div className="h-3 yt-skeleton rounded w-1/4" />
      </div>
    </div>
  );
}

export default function TrendingPage() {
  const [activeTab, setActiveTab] = useState<TrendTab>("Now");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setVideos([]);
    axiosClient
      .get("/video/getall", {
        params: {
          sort: "trending",
          limit: 20,
          category: CATEGORY_MAP[activeTab],
        },
      })
      .then((res) => {
        const items = res.data?.items ?? [];
        setVideos(Array.isArray(items) ? items : []);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <>
      <Head>
        <title>Trending - MyTube</title>
        <meta name="description" content="See what's trending on MyTube right now." />
      </Head>
      <main className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trending</h1>
            <p className="text-sm text-muted-foreground">What's hot right now</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border pb-1 overflow-x-auto scrollbar-hide">
          {TREND_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-full shrink-0 transition-colors ${
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Video list */}
        <div className="divide-y divide-border">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <VideoSkeleton key={i} />)
            : videos.length === 0
              ? (
                <div className="text-center py-16">
                  <Flame className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No trending videos right now</p>
                </div>
              )
              : videos.map((video, idx) => {
                const thumb = buildMediaUrl(video.thumbnailUrl);
                const views = typeof video.views === "number" ? video.views : 0;
                const timeAgo = video.createdAt ? dayjs(video.createdAt).fromNow() : "";
                return (
                  <Link key={video._id} href={`/watch/${video._id}`} className="flex gap-4 py-4 hover:bg-muted/30 rounded-xl px-2 transition-colors group -mx-2">
                    {/* Rank number */}
                    <div className="hidden sm:flex w-8 items-start justify-end pt-3 text-muted-foreground font-light text-xl shrink-0">
                      {idx + 1}
                    </div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-40 sm:w-48 md:w-64 rounded-xl overflow-hidden bg-muted shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={video.videotitle ?? ""}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                      {video.duration && (
                        <span className="yt-duration">{video.duration}</span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-1">
                      <h2 className="text-sm font-medium line-clamp-2 mb-1 group-hover:text-primary/80">
                        {video.videotitle}
                      </h2>
                      <p className="text-xs text-muted-foreground">{video.videochanel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatViews(views)} views{timeAgo ? ` • ${timeAgo}` : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
        </div>
      </main>
    </>
  );
}
