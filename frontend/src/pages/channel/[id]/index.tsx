import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import Channeldialogue from "@/components/channeldialogue";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/context/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "@/services/http/axios";
import Link from "next/link";
import { notify } from "@/services/toast";

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

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
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

  const loadPlaylists = async () => {
    const res = await axiosClient.get(`/playlist/channel/${channelId}`);
    setPlaylists(Array.isArray(res.data?.items) ? res.data.items : []);
  };

  const loadCommunity = async () => {
    const res = await axiosClient.get(`/community/channel/${channelId}`);
    setPosts(Array.isArray(res.data?.items) ? res.data.items : []);
  };

  const load = async (tab = activeTab) => {
    if (!router.isReady) return;
    if (!channelId) return;

    try {
      setLoading(true);
      await loadChannel();
      if (tab === "about") {
        setVideos([]);
        setPlaylists([]);
        setPosts([]);
      } else if (tab === "playlists") {
        setVideos([]);
        setPosts([]);
        await loadPlaylists();
      } else if (tab === "community") {
        setVideos([]);
        setPlaylists([]);
        await loadCommunity();
      } else {
        setPlaylists([]);
        setPosts([]);
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

  const createPost = async () => {
    const text = newPost.trim();
    if (!text) {
      notify.info("Write something to post");
      return;
    }

    try {
      await axiosClient.post(`/community/channel/${channelId}`, { text });
      setNewPost("");
      notify.success("Posted");
      await loadCommunity();
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Could not post");
    }
  };

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
    <div className="flex-1 bg-background min-w-0">
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
            activeTab === "playlists" ? (
              <div className="rounded-lg border bg-card p-4 text-card-foreground">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Playlists</h2>
                  {isOwner ? (
                    <Button asChild variant="outline">
                      <Link href="/playlists">Manage</Link>
                    </Button>
                  ) : null}
                </div>

                {playlists.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No playlists yet.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {playlists.map((p: any) => (
                      <Link
                        key={p._id}
                        href={`/playlists/${p._id}`}
                        className="rounded-lg border bg-background p-4 hover:bg-muted/40"
                      >
                        <div className="font-medium line-clamp-1">{p.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {(Array.isArray(p.videos) ? p.videos.length : 0).toLocaleString()} videos
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-4 text-card-foreground">
                <h2 className="text-xl font-semibold">Community</h2>

                {isOwner ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share an update…"
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button onClick={createPost} className="bg-red-600 hover:bg-red-700">
                        Post
                      </Button>
                    </div>
                  </div>
                ) : null}

                {posts.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No posts yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {posts.map((post: any) => (
                      <div key={post._id} className="rounded-lg border bg-background p-4">
                        <div className="text-sm whitespace-pre-wrap">{post.text}</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <ChannelVideos
              videos={videos}
              isOwner={isOwner}
              title={activeTab === "shorts" ? "Shorts" : "Videos"}
              emptyLabel={activeTab === "shorts" ? "No shorts uploaded yet." : "No videos uploaded yet."}
              onVideosChange={setVideos}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default index;