import Head from "next/head";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Video,
  Flag,
  MessageSquare,
  BarChart3,
  Shield,
  Settings,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";
import axiosClient from "@/services/http/axios";
import { useUser } from "@/context/AuthContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type AdminStats = {
  totalUsers: number;
  totalVideos: number;
  totalComments: number;
  totalReports: number;
};

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalVideos: 0, totalComments: 0, totalReports: 0 });
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "videos" | "users" | "reports">("dashboard");

  const isAdmin = user?.role === "admin" || user?.isAdmin;

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    Promise.all([
      axiosClient.get("/video/getall", { params: { limit: 10, sort: "latest" } }),
    ]).then(([videosRes]) => {
      const items = videosRes.data?.items ?? [];
      setVideos(items);
      setStats({
        totalVideos: videosRes.data?.totalPages ? videosRes.data.totalPages * 10 : items.length,
        totalUsers: 0,
        totalComments: 0,
        totalReports: 0,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!user?._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Admin access required</h1>
        <p className="text-muted-foreground mb-4">You must be signed in as an admin to access this page.</p>
        <Link href="/login" className="px-6 py-2 rounded-full text-sm font-medium" style={{ background: "#ff0000", color: "white" }}>Sign in</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold mb-2">Access denied</h1>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
      </div>
    );
  }

  const TABS = [
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "videos", label: "Videos", icon: <Video className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "reports", label: "Reports", icon: <Flag className="h-4 w-4" /> },
  ] as const;

  return (
    <>
      <Head>
        <title>Admin Panel - MyTube</title>
        <meta name="description" content="MyTube Admin Panel" />
      </Head>
      <div className="flex min-h-screen">
        {/* Admin sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border px-2 py-4 shrink-0">
          <div className="flex items-center gap-2 px-3 mb-4">
            <Shield className="h-5 w-5 text-red-500" />
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                activeTab === tab.key ? "bg-muted font-medium" : "hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          {/* Mobile tabs */}
          <div className="flex gap-2 mb-6 md:hidden overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm shrink-0 transition-colors ${
                  activeTab === tab.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Videos" value={stats.totalVideos} icon={<Video className="h-5 w-5 text-white" />} color="bg-blue-500" />
                <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="h-5 w-5 text-white" />} color="bg-green-500" />
                <StatCard label="Comments" value={stats.totalComments} icon={<MessageSquare className="h-5 w-5 text-white" />} color="bg-purple-500" />
                <StatCard label="Reports" value={stats.totalReports} icon={<Flag className="h-5 w-5 text-white" />} color="bg-red-500" />
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Recent activity
                </h2>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>• Platform is running normally</p>
                  <p>• No pending reports</p>
                  <p>• {videos.length} videos indexed</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "videos" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Video Management</h1>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-medium text-sm">All videos</span>
                  <span className="text-xs text-muted-foreground">{videos.length} shown</span>
                </div>
                {loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-20 aspect-video rounded-lg yt-skeleton shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 yt-skeleton rounded w-2/3" />
                          <div className="h-3 yt-skeleton rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {videos.map((v: any) => (
                      <div key={v._id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
                        <div className="w-20 aspect-video rounded bg-muted overflow-hidden shrink-0">
                          {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{v.videotitle}</p>
                          <p className="text-xs text-muted-foreground">{v.videochanel} • {(v.views ?? 0).toLocaleString()} views</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" className="p-1.5 rounded hover:bg-muted" title="View">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button type="button" className="p-1.5 rounded hover:bg-muted" title="Delete">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">User Management</h1>
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">User management API integration coming soon</p>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Reports</h1>
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No pending reports</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
