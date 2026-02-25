import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axiosClient from "@/services/http/axios";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

type SearchResultProps = {
  query?: string;
};

type VideoItem = {
  _id: string;
  videotitle?: string;
  videochanel?: string;
  uploader?: string;
  filepath?: string;
  thumbnailUrl?: string;
  views?: number;
  createdAt?: string | Date;
};

const SearchResult = ({ query }: SearchResultProps) => {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosClient.get("/video/getall", {
        params: { page: 1, limit: 50 },
      });
      const items = res.data?.items;
      setAllVideos(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error("Failed to load videos", e);
      setAllVideos([]);
      setError("Failed to load search results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    return allVideos.filter((vid) => {
      const title = String(vid?.videotitle ?? "").toLowerCase();
      const channel = String(vid?.videochanel ?? "").toLowerCase();
      return title.includes(q) || channel.includes(q);
    });
  }, [allVideos, query]);

  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <div className="flex gap-4">
          <Skeleton className="h-40 w-80 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-40 w-80 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-4/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Search unavailable" message={error} onRetry={load} />;
  }

  const hasResults = results.length > 0;
  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-muted-foreground">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Video Results */}
      <div className="space-y-4">
        {results.map((video) => {
          const title = video?.videotitle || "Untitled";
          const viewsText = `${Number(video?.views || 0).toLocaleString()} views`;
          let timeAgoText = "";
          if (video?.createdAt) {
            const date = new Date(video.createdAt);
            if (!Number.isNaN(date.getTime())) timeAgoText = `${formatDistanceToNow(date)} ago`;
          }

          return (
            <div key={video._id} className="group flex flex-col gap-4 sm:flex-row">
              <Link href={`/watch/${video._id}`} className="w-full flex-shrink-0 sm:w-80" aria-label={title}>
                <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={`${title} thumbnail`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="h-full w-full" aria-hidden="true" />
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0 py-1">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-lg line-clamp-2 mb-2">{title}</h3>
                </Link>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{viewsText}</span>
                  {timeAgoText ? (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>{timeAgoText}</span>
                    </>
                  ) : null}
                </div>

              <Link
                href={`/channel/${video?.uploader}`}
                className="flex items-center gap-2 mb-2 hover:underline"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/placeholder.svg?height=24&width=24" />
                  <AvatarFallback className="text-xs">
                    {String(video?.videochanel || "?").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {video?.videochanel || "Unknown channel"}
                </span>
              </Link>

              <p className="text-sm text-muted-foreground line-clamp-2">
                Sample video description that would show search-relevant content
                and help users understand what the video is about before
                clicking.
              </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Results */}
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Showing {results.length} results for &quot;{trimmedQuery}&quot;
        </p>
      </div>
    </div>
  );
};

export default SearchResult;