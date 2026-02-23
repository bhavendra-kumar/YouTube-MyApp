import { useCallback, useEffect, useMemo, useState } from "react";

import axiosClient from "@/services/http/axios";

type WatchPageState<TVideo> = {
  video: TVideo | null;
  relatedVideos: TVideo[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useWatchPageData<TVideo extends { _id?: string }>(
  id: string | null
): WatchPageState<TVideo> {
  const [video, setVideo] = useState<TVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [videoRes, allRes] = await Promise.all([
          axiosClient.get(`/video/${id}`),
          axiosClient.get("/video/getall", { params: { page: 1, limit: 50 } }),
        ]);

        if (cancelled) return;
        setVideo((videoRes.data ?? null) as TVideo | null);

        const items = allRes.data?.items;
        setAllVideos(Array.isArray(items) ? (items as TVideo[]) : []);
      } catch (e) {
        if (cancelled) return;
        setVideo(null);
        setAllVideos([]);
        setError("Failed to load video.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const relatedVideos = useMemo(() => {
    if (!id) return [];
    return allVideos.filter((v) => String(v?._id) !== String(id)).slice(0, 20);
  }, [allVideos, id]);

  return { video, relatedVideos, loading, error, reload };
}
