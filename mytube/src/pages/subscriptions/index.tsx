import Head from "next/head";
import { useEffect, useState } from "react";
import { Rss } from "lucide-react";
import VideoCard from "@/components/VideoCard";
import VideoCardSkeleton from "@/components/VideoCardSkeleton";
import axiosClient from "@/services/http/axios";
import { useUser } from "@/context/AuthContext";
import Link from "next/link";

type Video = {
  _id: string;
  videotitle?: string;
  videochanel?: string;
  thumbnailUrl?: string;
  views?: number;
  createdAt?: string;
  duration?: string;
  uploader?: string;
};

export default function SubscriptionsPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) { setLoading(false); return; }
    axiosClient
      .get("/subscribe/feed", { params: { limit: 20 } })
      .then((res) => {
        const data = res.data?.data ?? res.data?.items ?? [];
        setVideos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        return axiosClient.get("/video/getall", { params: { sort: "latest", limit: 20 } }).then((res) => {
          const items = res.data?.items ?? [];
          setVideos(Array.isArray(items) ? items : []);
        });
      })
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (!user?._id) {
    return (
      <>
        <Head><title>Subscriptions - MyTube</title></Head>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Rss className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Don't miss new videos</h1>
          <p className="text-muted-foreground mb-6 max-w-sm">Sign in to see updates from your favourite MyTube channels</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2 rounded-full border text-sm font-medium hover:bg-muted transition-colors" style={{ borderColor: "#3ea6ff", color: "#3ea6ff" }}>
            Sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Subscriptions - MyTube</title>
        <meta name="description" content="Videos from channels you subscribe to." />
      </Head>
      <main className="px-4 md:px-6 py-6 max-w-screen-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-6">Latest</h1>
        {loading ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Rss className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">You're all caught up</h2>
            <p className="text-muted-foreground text-sm max-w-sm">Subscribe to channels to see their latest uploads here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => <VideoCard key={v._id} video={v} />)}
          </div>
        )}
      </main>
    </>
  );
}
