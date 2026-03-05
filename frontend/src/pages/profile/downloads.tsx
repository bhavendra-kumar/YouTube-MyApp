import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import type { NextPageWithAuth } from "@/types/next";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";
import { Button } from "@/components/ui/button";
import { getPublicBackendUrl } from "@/lib/backendUrl";
import { buildMediaUrl } from "@/lib/media";

type DownloadRow = {
  videoId: string;
  videotitle: string;
  thumbnail?: string;
  filePath: string;
  downloadedAt?: string;
};

const DownloadsPage: NextPageWithAuth = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DownloadRow[]>([]);

  const backendUrl = getPublicBackendUrl();

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/downloads/my");
      const next = Array.isArray(res.data) ? (res.data as DownloadRow[]) : [];
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
  }, []);

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Downloads</h1>
            <div className="text-sm text-muted-foreground">
              Watch your downloaded videos directly from the server.
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/settings">Profile</Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading downloads…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No downloads yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((d) => {
              const thumb = d.thumbnail ? buildMediaUrl(d.thumbnail) : "";
              const src = backendUrl && d.filePath ? `${backendUrl}${d.filePath}` : "";

              return (
                <div key={`${d.videoId}:${d.filePath}`} className="rounded-lg border bg-background p-3">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="w-full md:w-80">
                      {src ? (
                        <video src={src} controls className="w-full rounded-md bg-black" />
                      ) : (
                        <div className="aspect-video w-full rounded-md bg-muted" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-base font-medium">{d.videotitle || "Untitled"}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {d.downloadedAt
                              ? `${formatDistanceToNow(new Date(d.downloadedAt))} ago`
                              : ""}
                          </div>
                        </div>
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/watch/${d.videoId}`}>Watch page</Link>
                        </Button>
                      </div>

                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="mt-3 h-16 w-28 rounded object-cover" />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

DownloadsPage.requireAuth = true;

export default DownloadsPage;
