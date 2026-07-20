import Head from "next/head";
import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  BarChart3,
  Users,
  Video,
  Eye,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Upload,
  Settings,
  DollarSign,
  FileText,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import axiosClient from "@/services/http/axios";
import { useUser } from "@/context/AuthContext";
import { buildMediaUrl } from "@/lib/media";
import { notify } from "@/services/toast";

dayjs.extend(relativeTime);

type Video = {
  _id: string;
  videotitle?: string;
  thumbnailUrl?: string;
  views?: number;
  Like?: number;
  createdAt?: string;
  duration?: string;
  category?: string;
};

type Stats = {
  views: number;
  subscribers: number;
  videos: number;
  likes: number;
};

function StatCard({ icon, label, value, change }: { icon: React.ReactNode; label: string; value: string | number; change?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        {change && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${change.startsWith("+") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function StudioPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ views: 0, subscribers: 0, videos: 0, likes: 0 });

  useEffect(() => {
    if (!user?._id) { setLoading(false); return; }
    axiosClient
      .get("/video/getall", { params: { uploader: user._id, limit: 10, sort: "latest" } })
      .then((res) => {
        const items: Video[] = res.data?.items ?? [];
        setVideos(items);
        const totalViews = items.reduce((sum, v) => sum + (v.views ?? 0), 0);
        const totalLikes = items.reduce((sum, v) => sum + (v.Like ?? 0), 0);
        setStats({ views: totalViews, subscribers: 0, videos: items.length, likes: totalLikes });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (!user?._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <Video className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Sign in to access Creator Studio</h1>
        <Link href="/login" className="mt-4 px-6 py-2 rounded-full text-sm font-medium" style={{ background: "#ff0000", color: "white" }}>Sign in</Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Creator Studio - MyTube</title>
        <meta name="description" content="Manage your MyTube channel, videos, and analytics." />
      </Head>
      <div className="flex min-h-screen">
        {/* Studio sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border px-2 py-4 shrink-0 gap-1">
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Studio</p>
          {[
            { label: "Dashboard", icon: <BarChart3 className="h-4 w-4" />, href: "/studio" },
            { label: "Content", icon: <Video className="h-4 w-4" />, href: "/studio" },
            { label: "Analytics", icon: <TrendingUp className="h-4 w-4" />, href: "/studio/analytics" },
            { label: "Comments", icon: <MessageSquare className="h-4 w-4" />, href: "/studio" },
            { label: "Subtitles", icon: <FileText className="h-4 w-4" />, href: "/studio" },
            { label: "Monetisation", icon: <DollarSign className="h-4 w-4" />, href: "/studio" },
            { label: "Customisation", icon: <Pencil className="h-4 w-4" />, href: "/studio" },
            { label: "Settings", icon: <Settings className="h-4 w-4" />, href: "/settings" },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
              {item.icon} {item.label}
            </Link>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Channel Dashboard</h1>
            <Link href="/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{ background: "#ff0000", color: "white" }}
            >
              <Upload className="h-4 w-4" /> Upload
            </Link>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Eye className="h-5 w-5" />} label="Total views" value={stats.views.toLocaleString()} change="+12%" />
            <StatCard icon={<Users className="h-5 w-5" />} label="Subscribers" value={stats.subscribers.toLocaleString()} change="+3%" />
            <StatCard icon={<Video className="h-5 w-5" />} label="Videos" value={stats.videos} />
            <StatCard icon={<ThumbsUp className="h-5 w-5" />} label="Total likes" value={stats.likes.toLocaleString()} change="+8%" />
          </div>

          {/* Recent videos table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Recent Videos</h2>
              <Link href="/upload" className="text-sm" style={{ color: "#3ea6ff" }}>Upload new</Link>
            </div>
            {loading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                    <div className="w-24 aspect-video rounded-lg yt-skeleton shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 yt-skeleton rounded w-2/3" />
                      <div className="h-3 yt-skeleton rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No videos uploaded yet</p>
                <Link href="/upload" className="mt-3 inline-block text-sm" style={{ color: "#3ea6ff" }}>Upload your first video</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {videos.map((v) => {
                  const thumb = buildMediaUrl(v.thumbnailUrl);
                  return (
                    <div key={v._id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors group">
                      {/* Thumbnail */}
                      <div className="w-24 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                        {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{v.videotitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(v.views ?? 0).toLocaleString()} views • {v.createdAt ? dayjs(v.createdAt).fromNow() : ""}
                        </p>
                      </div>
                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{v.Like ?? 0}</span>
                      </div>
                      {/* Actions */}
                      <button
                        type="button"
                        className="p-1.5 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => notify.info("Edit coming soon")}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

StudioPage.requireAuth = false;
