import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";

type SaveToPlaylistModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
};

export default function SaveToPlaylistModal({ open, onOpenChange, videoId }: SaveToPlaylistModalProps) {
  const { user } = useUser();
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Array<any>>([]);
  const [playlistBusyId, setPlaylistBusyId] = useState<string | null>(null);

  const loadPlaylists = async () => {
    if (!user?._id) return;
    try {
      setPlaylistsLoading(true);
      const res = await axiosClient.get("/playlist/mine");
      setPlaylists(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {
      notify.error("Could not load playlists");
      setPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (!user?._id) {
        notify.info("Sign in to save to playlists");
        onOpenChange(false);
        return;
      }
      void loadPlaylists();
    }
  }, [open, user?._id]);

  const isVideoInPlaylist = (p: any) => {
    if (!p || !Array.isArray(p.videos)) return false;
    return p.videos.some((v: any) => {
      if (typeof v === "string") return v === videoId;
      if (v && typeof v === "object") return String(v._id) === String(videoId) || String(v.videoId) === String(videoId);
      return false;
    });
  };

  const togglePlaylist = async (playlistId: string) => {
    if (!user?._id) return;
    if (playlistBusyId) return;

    const current = playlists.find((p) => String(p?._id) === String(playlistId));
    if (!current) return;

    const wasIn = isVideoInPlaylist(current);
    const prev = [...playlists];

    // Optimistic UI update
    setPlaylists((items) =>
      items.map((p) => {
        if (String(p?._id) !== String(playlistId)) return p;
        const clone = { ...p, videos: Array.isArray(p.videos) ? [...p.videos] : [] };
        if (wasIn) {
          clone.videos = clone.videos.filter((v: any) =>
            typeof v === "string" ? v !== videoId : String(v._id) !== String(videoId) && String(v.videoId) !== String(videoId)
          );
        } else {
          clone.videos.push({ _id: videoId });
        }
        return clone;
      })
    );

    try {
      setPlaylistBusyId(String(playlistId));
      if (wasIn) {
        await axiosClient.delete(`/playlist/${playlistId}/videos/${videoId}`);
        notify.success("Removed from playlist");
      } else {
        await axiosClient.post(`/playlist/${playlistId}/videos`, { videoId });
        notify.success("Saved to playlist");
      }
    } catch (e: any) {
      setPlaylists(prev);
      notify.error(e?.response?.data?.message || "Could not update playlist");
    } finally {
      setPlaylistBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save to playlist</DialogTitle>
        </DialogHeader>

        {playlistsLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : playlists.length === 0 ? (
          <div className="space-y-3 py-4 text-center">
            <div className="text-sm text-muted-foreground">No playlists yet.</div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/playlists">Create a playlist</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2 py-2 max-h-96 overflow-y-auto">
            {playlists.map((p) => {
              const checked = isVideoInPlaylist(p);
              const busy = playlistBusyId && String(playlistBusyId) === String(p._id);
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => void togglePlaylist(String(p._id))}
                  disabled={Boolean(busy)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/40 disabled:opacity-60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium line-clamp-1">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {(Array.isArray(p.videos) ? p.videos.length : 0).toLocaleString()} videos
                      {p.visibility ? ` • ${p.visibility}` : ""}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="h-4 w-4 accent-red-600 shrink-0"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="pt-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/playlists" onClick={() => onOpenChange(false)}>Manage playlists</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
