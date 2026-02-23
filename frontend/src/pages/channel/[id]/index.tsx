import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/context/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "@/services/http/axios";

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
        axiosClient.get(`/user/${channelId}`),
        axiosClient.get("/video/getall", { params: { uploader: channelId, page: 1 } }),
      ]);
      setChannel(channelRes.data);

      const items = videosRes.data?.items;
      setVideos(Array.isArray(items) ? items : []);
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
      const detail = (event as CustomEvent<{ uploader?: string; video?: any }>).detail;
      const uploader = detail?.uploader;
      if (!uploader) return;
      if (String(uploader) !== String(channelId)) return;

      const uploaded = detail?.video;
      if (uploaded && uploaded._id) {
        setVideos((prev) => [uploaded, ...prev.filter((v: any) => v._id !== uploaded._id)]);
        return;
      }

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