"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosClient from "@/services/http/axios";
import { useUser } from "@/context/AuthContext";
import { notify } from "@/services/toast";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

function sortAndDedupeMostRecent(items: any[]) {
  const map = new Map<string, any>();
  for (const item of items || []) {
    const videoId = String(item?.videoid?._id ?? item?.videoid ?? item?._id ?? "");
    if (!videoId) continue;

    const existing = map.get(videoId);
    if (!existing) {
      map.set(videoId, item);
      continue;
    }

    const a = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
    const b = new Date(existing?.updatedAt || existing?.createdAt || 0).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && a > b) {
      map.set(videoId, item);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
}

export default function HistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(true);
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      setError(null);
      const historyData = await axiosClient.get(`/history/${user?._id}`);
      const list = Array.isArray(historyData.data) ? historyData.data : [];
      setHistory(sortAndDedupeMostRecent(list));
    } catch (error) {
      console.error("Error loading history:", error);
      setError("Could not load watch history.");
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await axiosClient.delete(`/history/item/${historyId}`);
      setHistory((prev) => prev.filter((item) => item._id !== historyId));
      notify.success("Removed from watch history");
    } catch (error) {
      console.error("Error removing from history:", error);
      notify.error("Could not remove from watch history");
    }
  };

  const handleClearHistory = async () => {
    if (!user?._id) return;
    const ok = typeof window !== "undefined" ? window.confirm("Clear all watch history?") : false;
    if (!ok) return;

    try {
      await axiosClient.delete("/history/clear");
      setHistory([]);
      notify.success("Watch history cleared");
    } catch (err) {
      console.error("Error clearing history:", err);
      notify.error("Could not clear watch history");
    }
  };

  if (error) {
    return <ErrorState title="Watch history" message={error} onRetry={loadHistory} />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Keep track of what you watch
        </h2>
        <p className="text-gray-600">
          Watch history isn't viewable when signed out.
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No watch history yet</h2>
        <p className="text-gray-600">Videos you watch will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{history.length} videos</p>
        <Button variant="outline" size="sm" onClick={handleClearHistory}>
          Clear all
        </Button>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div key={item._id} className="flex gap-4 group">
            <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
              <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                <video
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${item.videoid?.filepath}`}
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/watch/${item.videoid._id}`}>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                  {item.videoid.videotitle}
                </h3>
              </Link>
              <p className="text-sm text-gray-600">
                {item.videoid.videochanel}
              </p>
              <p className="text-sm text-gray-600">
                {item.videoid.views.toLocaleString()} views •{" "}
                {formatDistanceToNow(new Date(item.videoid.createdAt))} ago
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Added {formatDistanceToNow(new Date(item.createdAt))} ago
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleRemoveFromHistory(item._id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from watch history
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}