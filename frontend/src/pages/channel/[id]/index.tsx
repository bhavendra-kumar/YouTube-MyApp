import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import Channeldialogue from "@/components/channeldialogue";
import { Button } from "@/components/ui/button";
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "home" | "videos" | "shorts" | "playlists" | "community" | "about"
  >("videos");
  const channelId = useMemo(() => (typeof id === "string" ? id : ""), [id]);

  const loadChannel = async () => {
    const channelRes = await axiosClient.get(`/user/${channelId}`);
    const channelData = (channelRes as any)?.data?.data ?? (channelRes as any)?.data ?? null;
    setChannel(channelData);
    return channelData;
  };

  const loadVideos = async (tab: typeof activeTab) => {
    const contentType = tab === "shorts" ? "short" : "video";
    const videosRes = await axiosClient.get("/video/getall", {
      params: { uploader: channelId, page: 1, contentType },
    });
    const items = videosRes.data?.items;
    setVideos(Array.isArray(items) ? items : []);
  };

  const load = async (tab = activeTab) => {
    if (!router.isReady) return;
    if (!channelId) return;

    try {
      setLoading(true);
      await loadChannel();
      if (tab === "about") {
        setVideos([]);
      } else {
        await loadVideos(tab);
      }
    } catch (e) {
      console.error("Error fetching channel data:", e);
      setChannel(null);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, channelId, router.isReady]);

  useEffect(() => {
    const onUploaded = (event: Event) => {
      const detail = (event as CustomEvent<{ uploader?: string; video?: any }>).detail;
      const uploader = detail?.uploader;
      if (!uploader) return;
      if (String(uploader) !== String(channelId)) return;

      // If user is on Shorts tab, don't optimistically inject videos of unknown type.
      if (activeTab === "shorts") {
        setLoading(true);
        load(activeTab);
        return;
      }

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
  }, [activeTab, channelId]);

  if (loading) {
    return <div className="flex-1 p-4">Loading channel...</div>;
  }

  if (!channel) {
    return <div className="flex-1 p-4">Channel not found</div>;
  }

  const channelName = String(
    channel?.channelname || channel?.name || channel?.email || ""
  ).trim();
  const isOwner = Boolean(user?._id && String(user._id) === String(channelId));

  if (!channel?._id) {
    return <div className="flex-1 p-4">Channel not found</div>;
  }

  if (!channelName) {
    if (!isOwner) {
      return <div className="flex-1 p-4">Channel not found</div>;
    }

    return (
      <main className="flex-1 p-6">
        <div className="mx-auto w-full max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
          <h1 className="text-2xl font-bold">Create your channel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set a channel name to start uploading videos.
          </p>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              Create channel
            </Button>
            <Button variant="outline" onClick={() => void router.push("/")}>Back</Button>
          </div>

          <Channeldialogue
            isopen={isCreateOpen}
            onclose={() => setIsCreateOpen(false)}
            channeldata={channel}
            mode="create"
            onSaved={() => {
              setIsCreateOpen(false);
              setLoading(true);
              void load();
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs activeTab={activeTab} onChange={setActiveTab} />
        {user && user?._id === channelId ? (
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={channelId}
              channelName={channel?.channelname}
              initialContentType="video"
            />
          </div>
        ) : null}
        <div className="px-4 pb-8">
          {activeTab === "about" ? (
            <div className="rounded-lg border bg-card p-4 text-card-foreground">
              <h2 className="text-xl font-semibold">About</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Description: </span>
                  <span>{channel?.description || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Joined: </span>
                  <span>
                    {channel?.joinedon
                      ? new Date(channel.joinedon).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === "playlists" || activeTab === "community" ? (
            <div className="rounded-lg border bg-card p-4 text-card-foreground">
              <h2 className="text-xl font-semibold">{activeTab === "playlists" ? "Playlists" : "Community"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This section isn’t available yet.
              </p>
            </div>
          ) : (
            <ChannelVideos videos={videos} />
          )}
        </div>
      </div>
    </div>
  );
};

export default index;