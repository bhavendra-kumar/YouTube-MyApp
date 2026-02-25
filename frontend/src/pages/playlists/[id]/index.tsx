import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import VideoCard from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";

type Playlist = {
  _id: string;
  owner: string;
  title: string;
  description?: string;
  visibility?: "public" | "unlisted" | "private";
  videos?: any[];
  createdAt?: string;
};

function parseVideoId(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";

  // Accept a raw ObjectId.
  if (/^[a-f0-9]{24}$/i.test(raw)) return raw;

  // Accept /watch/<id> URLs.
  const watchMatch = raw.match(/\/watch\/([a-f0-9]{24})/i);
  if (watchMatch?.[1]) return watchMatch[1];

  return "";
}

export default function PlaylistDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const playlistId = useMemo(() => (typeof id === "string" ? id : ""), [id]);
  const { user } = useUser();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);

  const [videoIdInput, setVideoIdInput] = useState("");

  const isOwner = Boolean(
    user?._id && playlist?.owner && String(user._id) === String(playlist.owner)
  );

  const load = async () => {
    if (!router.isReady || !playlistId) return;

    try {
      setLoading(true);
      const res = await axiosClient.get(`/playlist/${playlistId}`);
      setPlaylist(res.data ?? null);
    } catch (e: any) {
      console.error(e);
      setPlaylist(null);
      notify.error(e?.response?.data?.message || "Could not load playlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, playlistId]);

  const addVideo = async () => {
    const videoId = parseVideoId(videoIdInput);
    if (!videoId) {
      notify.info("Paste a video id or /watch/<id> link");
      return;
    }

    try {
      const res = await axiosClient.post(`/playlist/${playlistId}/videos`, {
        videoId,
      });
      setPlaylist(res.data ?? null);
      setVideoIdInput("");
      notify.success("Added to playlist");
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Could not add video");
    }
  };

  const removeVideo = async (videoId: string) => {
    try {
      const res = await axiosClient.delete(`/playlist/${playlistId}/videos/${videoId}`);
      setPlaylist(res.data ?? null);
      notify.success("Removed from playlist");
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Could not remove video");
    }
  };

  const deletePlaylist = async () => {
    if (!confirm("Delete this playlist?")) return;

    try {
      await axiosClient.delete(`/playlist/${playlistId}`);
      notify.success("Playlist deleted");
      router.push("/playlists");
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Could not delete playlist");
    }
  };

  if (loading) {
    return <main className="flex-1 p-6">Loading playlist…</main>;
  }

  if (!playlist) {
    return (
      <main className="flex-1 p-6">
        <div className="text-sm text-muted-foreground">Playlist not found.</div>
        <div className="mt-3">
          <Button asChild variant="outline">
            <Link href="/playlists">Back</Link>
          </Button>
        </div>
      </main>
    );
  }

  const videos = Array.isArray(playlist.videos) ? playlist.videos : [];

  return (
    <main className="flex-1 px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{playlist.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {videos.length.toLocaleString()} videos
              {playlist.visibility ? ` • ${playlist.visibility}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/playlists">Back</Link>
            </Button>
            {isOwner ? (
              <Button variant="destructive" onClick={deletePlaylist}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        {isOwner ? (
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-medium">Add video</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a video id or a watch link.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={videoIdInput}
                onChange={(e) => setVideoIdInput(e.target.value)}
                placeholder="e.g. 64f... or /watch/64f..."
              />
              <Button onClick={addVideo} className="bg-red-600 hover:bg-red-700">
                Add
              </Button>
            </div>
          </section>
        ) : null}

        {videos.length === 0 ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            No videos in this playlist.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v: any) => (
              <div key={v._id} className="relative">
                <VideoCard video={v} />
                {isOwner ? (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeVideo(String(v._id))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
