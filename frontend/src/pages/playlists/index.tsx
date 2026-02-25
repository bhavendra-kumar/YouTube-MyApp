import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";

type Playlist = {
  _id: string;
  title: string;
  description?: string;
  visibility?: "public" | "unlisted" | "private";
  videos?: unknown[];
  owner?: string;
  createdAt?: string;
};

export default function PlaylistsPage() {
  const [items, setItems] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">(
    "public"
  );

  const load = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/playlist/mine");
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      console.error(e);
      notify.error("Could not load playlists");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const safeTitle = title.trim();
    if (!safeTitle) {
      notify.info("Enter a playlist title");
      return;
    }

    try {
      await axiosClient.post("/playlist", { title: safeTitle, visibility });
      setTitle("");
      notify.success("Playlist created");
      await load();
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Could not create playlist");
    }
  };

  return (
    <main className="flex-1 px-4 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Playlists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create playlists and save videos.
          </p>
        </div>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">Create playlist</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_200px_auto]">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Playlist title"
            />

            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "public" | "unlisted" | "private")
              }
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>

            <Button onClick={create} className="bg-red-600 hover:bg-red-700">
              Create
            </Button>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Your playlists</h2>
            <Button variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">
              No playlists yet.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {items.map((p) => (
                <Link
                  key={p._id}
                  href={`/playlists/${p._id}`}
                  className="rounded-lg border bg-background p-4 hover:bg-muted/40"
                >
                  <div className="font-medium line-clamp-1">{p.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {(Array.isArray(p.videos) ? p.videos.length : 0).toLocaleString()} videos
                    {p.visibility ? ` • ${p.visibility}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

PlaylistsPage.requireAuth = true;
