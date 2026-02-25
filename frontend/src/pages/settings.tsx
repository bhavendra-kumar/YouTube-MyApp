import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import Channeldialogue from "@/components/channeldialogue";
import { useUser } from "@/context/AuthContext";
import { notify } from "@/services/toast";
import Link from "next/link";
import axiosClient from "@/services/http/axios";
import { buildMediaUrl } from "@/lib/media";

function readLocalStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export default function SettingsPage() {
  const { user, updateUser } = useUser();
  const { theme, setTheme } = useTheme();

  const [editChannelOpen, setEditChannelOpen] = useState(false);

  const [language, setLanguage] = useState("en");
  const [location, setLocation] = useState("IN");
  const [restrictedMode, setRestrictedMode] = useState(false);

  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

  useEffect(() => {
    const savedLang = readLocalStorage("yt:language");
    const savedLoc = readLocalStorage("yt:location");
    const savedRestricted = readLocalStorage("yt:restricted");

    if (savedLang) setLanguage(savedLang);
    if (savedLoc) setLocation(savedLoc);
    if (savedRestricted) setRestrictedMode(savedRestricted === "1");
  }, []);

  const uploadChannelImage = async (kind: "avatar" | "banner", file: File) => {
    if (!file) return;
    if (!user?._id) return;

    const form = new FormData();
    form.append(kind, file);

    try {
      setUploading(kind);
      const res = await axiosClient.post("/user/media", form, {
        headers: { "Content-Type": "multipart/form-data" },
      } as any);

      const updated = res.data;
      if (updated?.image) updateUser({ image: updated.image });
      if (updated?.bannerUrl) updateUser({ bannerUrl: updated.bannerUrl });
      notify.success("Channel updated");
    } catch (e: any) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <main className="w-full px-4 py-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Basic account and preference settings for this app.
          </p>
        </div>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">Account</h2>
          <div className="mt-3 space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Name: </span>
              <span>{user?.name || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span>{user?.email || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Role: </span>
              <span>{user?.role || "—"}</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">Channel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your channel details.
          </p>

          <div className="mt-3 space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Channel name: </span>
              <span>{user?.channelname || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Description: </span>
              <span>{user?.description || "—"}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => {
                if (!user?._id) return;
                setEditChannelOpen(true);
              }}
              disabled={!user?._id}
            >
              Edit channel
            </Button>

            {user?._id ? (
              <Button asChild variant="outline">
                <Link href={`/channel/${user._id}`}>View channel</Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-3">
              <div className="text-sm font-medium">Avatar</div>
              <div className="mt-2 flex items-center gap-3">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buildMediaUrl(user.image)}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted" />
                )}

                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadChannelImage("avatar", file);
                      e.currentTarget.value = "";
                    }}
                    disabled={!user?._id || uploading !== null}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!user?._id || uploading !== null}
                  >
                    {uploading === "avatar" ? "Uploading…" : "Upload avatar"}
                  </Button>
                </label>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <div className="text-sm font-medium">Banner</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-12 w-24 overflow-hidden rounded bg-muted">
                  {user?.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={buildMediaUrl(user.bannerUrl)}
                      alt="Banner"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadChannelImage("banner", file);
                      e.currentTarget.value = "";
                    }}
                    disabled={!user?._id || uploading !== null}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!user?._id || uploading !== null}
                  >
                    {uploading === "banner" ? "Uploading…" : "Upload banner"}
                  </Button>
                </label>
              </div>
            </div>
          </div>

          <Channeldialogue
            isopen={editChannelOpen}
            onclose={() => setEditChannelOpen(false)}
            channeldata={user}
            mode={user?.channelname ? "edit" : "create"}
            onSaved={() => {
              setEditChannelOpen(false);
            }}
          />
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current: {theme || "system"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
            >
              Device theme
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
              Dark
            </Button>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">Preferences</h2>

          <div className="mt-3 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Display language</div>
                <div className="text-muted-foreground">Saved: {language}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLanguage("en");
                    writeLocalStorage("yt:language", "en");
                    notify.success("Language preference saved");
                  }}
                >
                  English
                </Button>
                <Button
                  variant={language === "hi" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLanguage("hi");
                    writeLocalStorage("yt:language", "hi");
                    notify.success("Language preference saved");
                  }}
                >
                  Hindi
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Location</div>
                <div className="text-muted-foreground">Saved: {location}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={location === "IN" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLocation("IN");
                    writeLocalStorage("yt:location", "IN");
                    notify.success("Location preference saved");
                  }}
                >
                  India
                </Button>
                <Button
                  variant={location === "US" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLocation("US");
                    writeLocalStorage("yt:location", "US");
                    notify.success("Location preference saved");
                  }}
                >
                  United States
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Restricted Mode</div>
                <div className="text-muted-foreground">
                  Saved: {restrictedMode ? "On" : "Off"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={!restrictedMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRestrictedMode(false);
                    writeLocalStorage("yt:restricted", "0");
                    notify.success("Restricted Mode Off");
                  }}
                >
                  Off
                </Button>
                <Button
                  variant={restrictedMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRestrictedMode(true);
                    writeLocalStorage("yt:restricted", "1");
                    notify.success("Restricted Mode On");
                  }}
                >
                  On
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

SettingsPage.requireAuth = true;
