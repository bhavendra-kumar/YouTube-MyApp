import { useEffect, useMemo, useRef, useState } from "react";

import axiosClient from "@/services/http/axios";
import VideoCard from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ApiVideo = {
  _id: string;
  filepath?: string;
  videochanel?: string;
  videotitle?: string;
  category?: string;
  views?: number;
  createdAt?: string;
  Like?: number;
  Dislike?: number;
  uploader?: string;
  thumbnailUrl?: string;
};

type FeedSort = "latest" | "trending" | "mostLiked";

export default function SubscriptionsPage() {
  const { isCollapsed } = useSidebar();

  const [screenWidth, setScreenWidth] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      const next = window.screen?.width || window.innerWidth;
      setScreenWidth(Number.isFinite(next) ? next : window.innerWidth);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const [sort, setSort] = useState<FeedSort>("latest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const limit = 12;

  const sortLabel: Record<FeedSort, string> = {
    latest: "Latest",
    trending: "Trending",
    mostLiked: "Most liked",
  };

  const filterKey = `${sort}`;
  const lastFetchedFilterKey = useRef(filterKey);

  useEffect(() => {
    setPage(1);
  }, [sort]);

  useEffect(() => {
    if (lastFetchedFilterKey.current !== filterKey && page !== 1) return;

    const run = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get("/subscribe/feed", {
          params: {
            page,
            limit,
            sort,
          },
        });

        const items = res.data?.items;
        setVideos(Array.isArray(items) ? items : []);

        const nextTotalPages = Number(res.data?.totalPages ?? 0);
        const nextCurrentPage = Number(res.data?.currentPage ?? page);
        setTotalPages(Number.isFinite(nextTotalPages) ? nextTotalPages : 0);
        lastFetchedFilterKey.current = filterKey;

        if (
          Number.isFinite(nextCurrentPage) &&
          nextCurrentPage > 0 &&
          nextCurrentPage !== page
        ) {
          setPage(nextCurrentPage);
        }
      } catch (e) {
        console.error("Failed to load subscriptions feed", e);
        setVideos([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [filterKey, limit, page, sort]);

  const lgColsClass = useMemo(() => {
    const w = screenWidth ?? 0;

    if (isCollapsed) {
      if (w >= 2560) return "lg:grid-cols-3";
      return "lg:grid-cols-4";
    }

    if (w >= 2560) return "lg:grid-cols-3";
    if (w >= 1920) return "lg:grid-cols-4";
    return "lg:grid-cols-3";
  }, [isCollapsed, screenWidth]);

  return (
    <main className="flex-1 p-4">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Subscriptions</h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort: {sortLabel[sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort("latest")}>
                Latest
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("trending")}>
                Trending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("mostLiked")}>
                Most liked
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : videos.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No videos from your subscriptions yet.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div
              className={cn(
                "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2",
                lgColsClass
              )}
            >
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                >
                  Prev
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={loading || page >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

SubscriptionsPage.requireAuth = true;
