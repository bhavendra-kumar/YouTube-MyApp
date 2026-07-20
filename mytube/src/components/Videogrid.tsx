import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { Category } from "@/components/CategoryTab";
import axiosClient from "@/services/http/axios";
import VideoCard from "@/components/VideoCard";
import VideoCardSkeleton from "@/components/VideoCardSkeleton";
import { uniqueById } from "@/lib/utils";

type ApiVideo = {
  _id: string;
  filepath?: string;
  thumbnailUrl?: string;
  videochanel?: string;
  videotitle?: string;
  category?: string;
  views?: number;
  createdAt?: string;
  duration?: string;
  Like?: number;
  Dislike?: number;
  uploader?: string;
  isVerified?: boolean;
};

type VideogridProps = {
  activeCategory?: Category;
  uploaderFilter?: string;
};

function getSearchQueryParam(raw: unknown) {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return "";
}

const LIMIT = 8;

export default function Videogrid({ activeCategory = "All", uploaderFilter }: VideogridProps) {
  const router = useRouter();
  const search = getSearchQueryParam(router.query.search).trim().toLowerCase();

  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const filterKey = `${String(activeCategory)}|${search}|${uploaderFilter ?? ""}`;
  const lastFetchedFilterKey = useRef(filterKey);
  const inFlightRef = useRef(false);
  const lastRequestedRef = useRef<{ key: string; page: number }>({ key: "", page: 0 });
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
  }, [activeCategory, search, uploaderFilter]);

  useEffect(() => {
    if (lastFetchedFilterKey.current !== filterKey && page !== 1) return;
    if (
      inFlightRef.current &&
      lastRequestedRef.current.key === filterKey &&
      lastRequestedRef.current.page === page
    ) return;

    lastRequestedRef.current = { key: filterKey, page };
    inFlightRef.current = true;

    const run = async () => {
      const isFirstPage = page === 1;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await axiosClient.get("/video/getall", {
          params: {
            page,
            limit: LIMIT,
            sort: "latest",
            category: activeCategory === "All" ? undefined : activeCategory,
            q: search || undefined,
            uploader: uploaderFilter || undefined,
          },
        });

        const items = res.data?.items;
        const list: ApiVideo[] = Array.isArray(items) ? items : [];
        setVideos((prev) => uniqueById(isFirstPage ? list : mergeUniqueById(prev, list)));

        const nextTotalPages = Number(res.data?.totalPages ?? 0);
        const nextCurrentPage = Number(res.data?.currentPage ?? page);
        setTotalPages(Number.isFinite(nextTotalPages) ? nextTotalPages : 0);
        lastFetchedFilterKey.current = filterKey;

        if (Number.isFinite(nextCurrentPage) && nextCurrentPage > 0 && nextCurrentPage !== page) {
          setPage(nextCurrentPage);
        }
      } catch (e) {
        console.error("Failed to load videos", e);
        if (page === 1) { setVideos([]); setTotalPages(0); }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        inFlightRef.current = false;
      }
    };

    void run();
  }, [activeCategory, filterKey, page, search, uploaderFilter]);

  // Infinite scroll
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || !hasMore || loading || loadingMore) return;
        setPage((p) => p + 1);
      },
      { root: null, rootMargin: "400px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  // Listen for upload events
  useEffect(() => {
    const onUploaded = (event: Event) => {
      const detail = (event as CustomEvent<{ video?: ApiVideo | null }>).detail;
      const uploaded = detail?.video;
      if (uploaded?._id) {
        if (page === 1) {
          setVideos((prev) => [uploaded, ...prev.filter((v) => v._id !== uploaded._id)]);
          return;
        }
        setPage(1);
        return;
      }
      setPage(1);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("video:uploaded", onUploaded as EventListener);
      return () => window.removeEventListener("video:uploaded", onUploaded as EventListener);
    }
  }, []);

  const filtered = useMemo(() => {
    const deduped = uniqueById(videos);
    if (!search) return deduped;
    return deduped.filter((v) => {
      const haystack = `${v.videotitle ?? ""} ${v.videochanel ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [search, videos]);

  // SKELETON loading state
  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: LIMIT }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-lg font-medium mb-2">No videos found</h3>
        <p className="text-sm text-muted-foreground">
          {search
            ? `No results for "${search}"`
            : activeCategory !== "All"
              ? `No ${activeCategory} videos yet`
              : "No videos have been uploaded yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 mt-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
