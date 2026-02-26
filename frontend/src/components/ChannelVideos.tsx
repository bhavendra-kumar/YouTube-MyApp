import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildMediaUrl } from "@/lib/media";

export type ChannelVideoItem = {
  _id: string;
  videotitle?: string;
  thumbnailUrl?: string;
  videochanel?: string;
  createdAt?: string;
  views?: number;
  category?: string;
  contentType?: "video" | "short" | string;
};

type Props = {
  videos: ChannelVideoItem[];
  isOwner?: boolean;
  title?: string;
  emptyLabel?: string;
  onVideosChange?: (next: ChannelVideoItem[]) => void;
};

type EditState = {
  id: string;
  videotitle: string;
  category: string;
};

export default function ChannelVideos({
  videos,
  isOwner = false,
  title = "Videos",
  emptyLabel = "No videos uploaded yet.",
  onVideosChange,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, ChannelVideoItem>();
    for (const v of videos) m.set(String(v._id), v);
    return m;
  }, [videos]);

  const openEdit = (id: string) => {
    const v = byId.get(String(id));
    if (!v) return;
    setEditState({
      id: String(v._id),
      videotitle: String(v.videotitle || "").trim(),
      category: String(v.category || "All").trim() || "All",
    });
    setEditOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(String(id));
    setDeleteOpen(true);
  };

  const applyLocalUpdate = (updated: ChannelVideoItem) => {
    const next = videos.map((v) => (String(v._id) === String(updated._id) ? { ...v, ...updated } : v));
    onVideosChange?.(next);
  };

  const applyLocalDelete = (id: string) => {
    const next = videos.filter((v) => String(v._id) !== String(id));
    onVideosChange?.(next);
  };

  const saveEdit = async () => {
    if (!editState) return;
    const id = editState.id;
    const videotitle = editState.videotitle.trim();
    const category = editState.category.trim();
    if (!videotitle) {
      notify.info("Title is required");
      return;
    }

    setBusy(true);
    try {
      const res = await axiosClient.patch(`/video/${encodeURIComponent(id)}`, {
        videotitle,
        category,
      });
      const updated = res.data as ChannelVideoItem;
      applyLocalUpdate(updated);
      notify.success("Updated");
      setEditOpen(false);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || "Could not update video");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    const id = deleteId;
    if (!id) return;

    setBusy(true);
    try {
      await axiosClient.delete(`/video/${encodeURIComponent(id)}`);
      applyLocalDelete(id);
      notify.success("Deleted");
      setDeleteOpen(false);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || "Could not delete video");
    } finally {
      setBusy(false);
    }
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => {
          const id = String(video._id);
          const href = `/watch/${encodeURIComponent(id)}`;
          const label = String(video.videotitle || "Watch video");
          return (
            <div key={id} className="rounded-lg border bg-card text-card-foreground overflow-hidden">
              <div className="relative">
                <Link href={href} aria-label={label}>
                  <div className="relative aspect-video bg-muted">
                    {video.thumbnailUrl ? (
                      <img
                        src={buildMediaUrl(video.thumbnailUrl)}
                        alt={`${label} thumbnail`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full" aria-hidden="true" />
                    )}
                  </div>
                </Link>

                {isOwner ? (
                  <div className="absolute right-2 top-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full"
                          aria-label="Video actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDelete(id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>

              <div className="p-3">
                <Link href={href} className="block">
                  <div className="font-medium line-clamp-2">{video.videotitle}</div>
                </Link>
                <div className="mt-1 text-xs text-muted-foreground">
                  {video.category ? video.category : ""}
                  {video.contentType ? (video.category ? " • " : "") + String(video.contentType) : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit video</DialogTitle>
            <DialogDescription>Update title and category.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Title</div>
              <Input
                value={editState?.videotitle ?? ""}
                onChange={(e) => setEditState((s) => (s ? { ...s, videotitle: e.target.value } : s))}
                aria-label="Video title"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Category</div>
              <Input
                value={editState?.category ?? ""}
                onChange={(e) => setEditState((s) => (s ? { ...s, category: e.target.value } : s))}
                aria-label="Video category"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" onClick={saveEdit} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete video?</DialogTitle>
            <DialogDescription>This will remove the upload from your channel.</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}