import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const channelId = useMemo(() => (typeof id === "string" ? id : ""), [id]);

  const load = async () => {
    if (!router.isReady) return;
    if (!channelId) return;

    try {
      const [channelRes, videosRes] = await Promise.all([
        axiosInstance.get(`/user/${channelId}`),
        axiosInstance.get("/video/getall"),
      ]);
      setChannel(channelRes.data);

      const allVideos = Array.isArray(videosRes.data) ? videosRes.data : [];
      setVideos(
        allVideos.filter((v: any) => String(v?.uploader) === String(channelId))
      );
    } catch (e) {
      console.error("Error fetching channel data:", e);
      setChannel(null);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [channelId, router.isReady]);

  useEffect(() => {
    const onUploaded = (event: Event) => {
      const uploader = (event as CustomEvent<{ uploader?: string }>)?.detail
        ?.uploader;
      if (!uploader) return;
      if (String(uploader) !== String(channelId)) return;

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
  }, [channelId]);

  if (loading) {
    return <div className="flex-1 p-4">Loading channel...</div>;
  }

  if (!channel) {
    return <div className="flex-1 p-4">Channel not found</div>;
  }

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs />
        {user && user?._id === channelId ? (
          <div className="px-4 pb-8">
            <VideoUploader channelId={channelId} channelName={channel?.channelname} />
          </div>
        ) : null}
        <div className="px-4 pb-8">
          <ChannelVideos videos={videos} />
        </div>
      </div>
    </div>
  );
};

export default index;