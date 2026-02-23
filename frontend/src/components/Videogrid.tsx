import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import type { Category } from "@/components/CategoryTab";
import axiosClient from "@/services/http/axios";
import VideoCard from "@/components/VideoCard"
import { Button } from "@/components/ui/button";
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
};

type VideogridProps = {
  activeCategory?: Category;
};

type VideoSort = "latest" | "trending" | "mostLiked";

function getSearchQueryParam(raw: unknown) {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return "";
}

export default function Videogrid({ activeCategory = "All" }: VideogridProps) {
  const router = useRouter();
  const search = getSearchQueryParam(router.query.search).trim().toLowerCase();

  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const [sort, setSort] = useState<VideoSort>("latest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const limit = 8;

  const sortLabel: Record<VideoSort, string> = {
    latest: "Latest",
    trending: "Trending",
    mostLiked: "Most liked",
  };

  const filterKey = `${String(activeCategory)}|${search}|${sort}`;
  const lastFetchedFilterKey = useRef(filterKey);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, search, sort]);

  useEffect(() => {
    // If filters changed, wait for page reset to 1 before fetching.
    if (lastFetchedFilterKey.current !== filterKey && page !== 1) return;

    const run = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get("/video/getall", {
          params: {
            page,
            limit,
            sort,
            category: activeCategory,
            q: search || undefined,
          },
        });

        const items = res.data?.items;
        setVideos(Array.isArray(items) ? items : []);

        const nextTotalPages = Number(res.data?.totalPages ?? 0);
        const nextCurrentPage = Number(res.data?.currentPage ?? page);
        setTotalPages(Number.isFinite(nextTotalPages) ? nextTotalPages : 0);
        lastFetchedFilterKey.current = filterKey;

        if (Number.isFinite(nextCurrentPage) && nextCurrentPage > 0 && nextCurrentPage !== page) {
          setPage(nextCurrentPage);
        }
      } catch (e) {
        console.error("Failed to load videos", e);
        setVideos([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeCategory, filterKey, limit, page, search, sort]);

  useEffect(() => {
    const onUploaded = (event: Event) => {
      const detail = (event as CustomEvent<{ video?: ApiVideo | null }>).detail;
      const uploaded = detail?.video;

      if (uploaded && uploaded._id) {
        if (page === 1 && sort === "latest") {
          setVideos((prev) => [uploaded, ...prev.filter((v) => v._id !== uploaded._id)]);
          return;
        }

        setPage(1);
        return;
      }

      // Fallback for older event payloads
      setPage(1);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("video:uploaded", onUploaded as EventListener);
      return () => {
        window.removeEventListener(
          "video:uploaded",
          onUploaded as EventListener
        );
      };
    }
  }, []);

  const filtered = useMemo(() => {
    // Server already filters by category and search. Keep this as a safe-guard.
    return videos.filter((v) => {
      if (!search) return true;
      const haystack = `${v.videotitle ?? ""} ${v.videochanel ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [search, videos]);

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No videos found.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort: {sortLabel[sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSort("latest")}>Latest</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("trending")}>Trending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("mostLiked")}>Most liked</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((video) => (
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
  );
}

