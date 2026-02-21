import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import type { Category } from "@/components/CategoryTab";
import axiosInstance from "@/lib/axiosinstance";
import VideoCard from "@/components/VideoCard"

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

  const load = async () => {
    try {
      const res = await axiosInstance.get("/video/getall");
      setVideos(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to load videos", e);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onUploaded = () => {
      setLoading(true);
      load();
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
    const categoryOk = (v: ApiVideo) => {
      if (activeCategory === "All") return true;
      const vCat = String(v?.category ?? "").trim().toLowerCase();
      return vCat === activeCategory.trim().toLowerCase();
    };

    return videos.filter((v) => {
      if (!categoryOk(v)) return false;
      if (!search) return true;
      const haystack = `${v.videotitle ?? ""} ${v.videochanel ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [activeCategory, search, videos]);

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading videos...</div>;
  }

  if (filtered.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No videos found.
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((video) => (
        <VideoCard key={video._id} video={video} />
      ))}
    </div>
  );
}

