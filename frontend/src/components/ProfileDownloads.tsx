import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";
import { buildMediaUrl } from "@/lib/media";

type DownloadItem = {
  videoId: string;
  videotitle: string;
  thumbnail?: string;
  filePath?: string;
  downloadedAt?: string;
};

export default function ProfileDownloads() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DownloadItem[]>([]);

  const load = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const res = await axiosClient.get("/api/downloads");
      const next = Array.isArray(res.data) ? (res.data as DownloadItem[]) : [];
      setItems(next);
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Could not load downloads");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  if (!user?._id) {
    return (
      <div className="text-sm text-muted-foreground">Sign in to see your downloads.</div>
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading downloads…</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">No downloads yet.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((row) => {
          const vid = row?.videoId;
          if (!vid) return null;
          const thumb = row.thumbnail ? buildMediaUrl(row.thumbnail) : "";

          return (
            <div
              key={`${vid}:${row.downloadedAt || ""}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-20 overflow-hidden rounded bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-medium">
                    {row.videotitle || "Untitled"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.downloadedAt
                      ? `${formatDistanceToNow(new Date(row.downloadedAt))} ago`
                      : ""}
                  </div>
                </div>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link href={`/watch/${vid}`}>Watch</Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
