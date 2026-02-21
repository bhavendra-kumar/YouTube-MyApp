import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { buildMediaUrl } from "@/lib/media";

type SearchResultProps = {
  query?: string;
};

type VideoItem = {
  _id: string;
  videotitle?: string;
  videochanel?: string;
  uploader?: string;
  filepath?: string;
  views?: number;
  createdAt?: string | Date;
};

const SearchResult = ({ query }: SearchResultProps) => {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get<VideoItem[]>("/video/getall");
        setAllVideos(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to load videos", e);
        setAllVideos([]);
      } finally {
        setLoading(false);
      }
    };

    load();
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
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12">Loading search results...</div>;
  }

  const hasResults = results.length > 0;
  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Video Results */}
      <div className="space-y-4">
        {results.map((video) => (
          <div key={video._id} className="flex gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={buildMediaUrl(video?.filepath)}
                  preload="metadata"
                  muted
                  playsInline
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                  {video?.videotitle || "Untitled"}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{Number(video?.views || 0).toLocaleString()} views</span>
                <span>•</span>
                <span>
                  {(() => {
                    if (!video?.createdAt) return "";
                    const date = new Date(video.createdAt);
                    if (Number.isNaN(date.getTime())) return "";
                    return `${formatDistanceToNow(date)} ago`;
                  })()}
                </span>
              </div>

              <Link
                href={`/channel/${video?.uploader}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/placeholder.svg?height=24&width=24" />
                  <AvatarFallback className="text-xs">
                    {String(video?.videochanel || "?").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">
                  {video?.videochanel || "Unknown channel"}
                </span>
              </Link>

              <p className="text-sm text-gray-700 line-clamp-2">
                Sample video description that would show search-relevant content
                and help users understand what the video is about before
                clicking.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Results */}
      <div className="text-center py-8">
        <p className="text-gray-600">
          Showing {results.length} results for &quot;{trimmedQuery}&quot;
        </p>
      </div>
    </div>
  );
};

export default SearchResult;