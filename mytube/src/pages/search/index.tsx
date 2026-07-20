import Head from "next/head";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { Search, SlidersHorizontal, X, Clock, TrendingUp } from "lucide-react";
import VideoCard from "@/components/VideoCard";
import VideoCardSkeleton from "@/components/VideoCardSkeleton";
import axiosClient from "@/services/http/axios";
import { uniqueById } from "@/lib/utils";

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

const SORT_OPTIONS = [
  { label: "Relevance", value: "latest" },
  { label: "Upload date", value: "latest" },
  { label: "View count", value: "trending" },
  { label: "Most liked", value: "mostLiked" },
] as const;

const DURATION_OPTIONS = ["Any", "Under 4 minutes", "4–20 minutes", "Over 20 minutes"];
const TYPE_OPTIONS = ["All", "Video", "Short", "Live"];

function getQ(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return "";
}

export default function SearchPage() {
  const router = useRouter();
  const q = getQ(router.query.q).trim();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("latest");
  const [duration, setDuration] = useState("Any");
  const [type, setType] = useState("All");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevQ = useRef(q);

  const fetchVideos = useCallback(async (pageNum: number, reset: boolean) => {
    if (!q) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await axiosClient.get("/video/getall", {
        params: {
          q,
          page: pageNum,
          limit: 10,
          sort,
          contentType: type === "Short" ? "short" : type === "Video" ? "video" : undefined,
        },
      });
      const items: Video[] = Array.isArray(res.data?.items) ? res.data.items : [];
      setVideos((prev) => reset ? items : uniqueById([...prev, ...items]));
      setTotalPages(Number(res.data?.totalPages ?? 0));
    } catch {
      if (reset) setVideos([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [q, sort, type]);

  // Fetch on query/filter change
  useEffect(() => {
    if (!q) return;
    setPage(1);
    setVideos([]);
    setTotalPages(0);
    void fetchVideos(1, true);
    prevQ.current = q;
  }, [q, sort, type]);

  // Infinite scroll
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof window === "undefined") return;
    const hasMore = page < totalPages;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          void fetchVideos(nextPage, false);
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [page, totalPages, loading, loadingMore, fetchVideos]);

  return (
    <>
      <Head>
        <title>{q ? `${q} - MyTube Search` : "Search - MyTube"}</title>
        <meta name="description" content={q ? `Search results for "${q}" on MyTube` : "Search MyTube"} />
      </Head>
      <main className="px-4 md:px-6 py-4 max-w-5xl mx-auto">

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm hover:bg-muted transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </button>
          {/* Sort chips */}
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setSort(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                sort === opt.value ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Expanded filters panel */}
        {filtersOpen && (
          <div className="mb-4 p-4 bg-card border border-border rounded-xl space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium w-20 shrink-0">Duration</span>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((d) => (
                  <button key={d} type="button" onClick={() => setDuration(d)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${duration === d ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium w-20 shrink-0">Type</span>
              <div className="flex gap-2 flex-wrap">
                {TYPE_OPTIONS.map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${type === t ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results header */}
        {q && !loading && (
          <p className="text-sm text-muted-foreground mb-4">
            {videos.length === 0 ? "No" : `About ${videos.length}`} results for{" "}
            <strong className="text-foreground">&ldquo;{q}&rdquo;</strong>
          </p>
        )}

        {/* No query state */}
        {!q && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Search MyTube</h1>
            <p className="text-muted-foreground text-sm">
              Type a search term in the box above to find videos
            </p>
          </div>
        )}


        {/* Loading skeleton for list layout */}
        {loading && q && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-48 aspect-video rounded-xl yt-skeleton shrink-0" />
                <div className="flex-1 space-y-3 pt-2">
                  <div className="h-4 yt-skeleton rounded w-3/4" />
                  <div className="h-4 yt-skeleton rounded w-1/2" />
                  <div className="h-3 yt-skeleton rounded w-1/3" />
                  <div className="h-3 yt-skeleton rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results — list layout */}
        {!loading && q && videos.length > 0 && (
          <div className="space-y-1">
            {videos.map((v) => (
              <VideoCard key={v._id} video={v} layout="list" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && q && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-3" />
            <h2 className="font-semibold mb-1">No results found</h2>
            <p className="text-sm text-muted-foreground">Try different keywords or remove search filters</p>
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />
        {loadingMore && (
          <div className="space-y-4 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-48 aspect-video rounded-xl yt-skeleton shrink-0" />
                <div className="flex-1 space-y-2 pt-2">
                  <div className="h-4 yt-skeleton rounded w-2/3" />
                  <div className="h-3 yt-skeleton rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}