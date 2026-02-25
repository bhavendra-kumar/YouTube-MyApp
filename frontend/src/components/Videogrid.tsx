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
  const [loadingMore, setLoadingMore] = useState(false);

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

  const inFlightRef = useRef(false);
  const lastRequestedRef = useRef<{ key: string; page: number }>({
    key: "",
    page: 0,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = totalPages > 0 ? page < totalPages : false;

  function mergeUniqueById(prev: ApiVideo[], next: ApiVideo[]) {
    if (next.length === 0) return prev;
    const seen = new Set(prev.map((v) => String(v._id)));
    const merged = prev.slice();
    for (const item of next) {
      const id = String(item?._id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(item);
    }
    return merged;
  }

  useEffect(() => {
    setPage(1);
    setVideos([]);
    setTotalPages(0);
  }, [activeCategory, search, sort]);

  useEffect(() => {
    // If filters changed, wait for page reset to 1 before fetching.
    if (lastFetchedFilterKey.current !== filterKey && page !== 1) return;

    // Prevent duplicate fetches for the same key+page.
    if (
      inFlightRef.current &&
      lastRequestedRef.current.key === filterKey &&
      lastRequestedRef.current.page === page
    ) {
      return;
    }

    lastRequestedRef.current = { key: filterKey, page };
    inFlightRef.current = true;

    const run = async () => {
      const isFirstPage = page === 1;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      try {
        const useHomeFeed =
          activeCategory === "All" &&
          !search &&
          sort === "trending";

        if (useHomeFeed) {
          const res = await axiosClient.get("/video/home", {
            params: {
              page,
              limit,
            },
          });

          const items = res.data?.data;
          const list = Array.isArray(items) ? items : [];
          setVideos((prev) => (page === 1 ? list : mergeUniqueById(prev, list)));

          const total = Number(res.data?.total ?? 0);
          const nextTotalPages = total === 0 ? 0 : Math.ceil(total / limit);
          setTotalPages(Number.isFinite(nextTotalPages) ? nextTotalPages : 0);
          lastFetchedFilterKey.current = filterKey;

          if (nextTotalPages > 0 && page > nextTotalPages) {
            setPage(nextTotalPages);
          }
        } else {
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
          const list = Array.isArray(items) ? items : [];
          setVideos((prev) => (page === 1 ? list : mergeUniqueById(prev, list)));

          const nextTotalPages = Number(res.data?.totalPages ?? 0);
          const nextCurrentPage = Number(res.data?.currentPage ?? page);
          setTotalPages(Number.isFinite(nextTotalPages) ? nextTotalPages : 0);
          lastFetchedFilterKey.current = filterKey;

          if (Number.isFinite(nextCurrentPage) && nextCurrentPage > 0 && nextCurrentPage !== page) {
            setPage(nextCurrentPage);
          }
        }
      } catch (e) {
        console.error("Failed to load videos", e);
        if (page === 1) {
          setVideos([]);
          setTotalPages(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        inFlightRef.current = false;
      }
    };

    run();
  }, [activeCategory, filterKey, limit, page, search, sort]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        if (!hasMore) return;
        if (loading || loadingMore) return;

        setPage((p) => p + 1);
      },
      { root: null, rootMargin: "400px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

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

      <div
        className="grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {filtered.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loadingMore ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading more...</p>
      ) : null}
    </div>
  );
}

