import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Share, Code, Facebook, Link2, Mail, X } from "lucide-react";
import { notify } from "@/services/toast";

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  videoTitle: string;
  currentTimeSeconds?: number;
};

export default function ShareModal({
  open,
  onOpenChange,
  videoUrl,
  videoTitle,
  currentTimeSeconds = 0,
}: ShareModalProps) {
  const [startAtEnabled, setStartAtEnabled] = useState(false);
  const [currentStartAtSeconds, setCurrentStartAtSeconds] = useState(currentTimeSeconds);

  useEffect(() => {
    if (open) {
      setCurrentStartAtSeconds(Math.floor(currentTimeSeconds));
    }
  }, [open, currentTimeSeconds]);

  const buildShareUrl = (base: string, seconds?: number) => {
    if (!base) return "";
    try {
      const u = new URL(base);
      if (startAtEnabled && seconds != null) {
        u.searchParams.set("t", String(Math.floor(seconds)));
      } else {
        u.searchParams.delete("t");
      }
      return u.toString();
    } catch {
      return base;
    }
  };

  const finalShareUrl = buildShareUrl(videoUrl, currentStartAtSeconds);

  const handleCopyShareLink = async () => {
    if (!finalShareUrl) return;
    try {
      await navigator.clipboard.writeText(finalShareUrl);
      notify.success("Link copied to clipboard");
    } catch (e) {
      notify.error("Failed to copy link");
    }
  };

  const handleCopyEmbed = async () => {
    try {
      const url = finalShareUrl || videoUrl;
      const iframe = `<iframe width="560" height="315" src="${url}" title="${(videoTitle || "").replace(
        /"/g,
        "&quot;"
      )}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      await navigator.clipboard.writeText(iframe);
      notify.success("Embed code copied to clipboard");
    } catch (e) {
      notify.error("Failed to copy embed code");
    }
  };

  const openExternalShare = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const shareText = String(videoTitle || "").trim() || "Check this video";
  const encodedUrl = encodeURIComponent(finalShareUrl);

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText} ${finalShareUrl}`
  )}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const xHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(
    shareText
  )}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(
    finalShareUrl
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Share in a post</div>
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => notify.info("Create post is not available yet")}
          >
            Create post
          </Button>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-start gap-4 overflow-x-auto pb-1">
          <button
            type="button"
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            disabled={!finalShareUrl}
            onClick={handleCopyEmbed}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <Code className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">Embed</span>
          </button>

          <button
            type="button"
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            disabled={!finalShareUrl}
            onClick={() => openExternalShare(whatsappHref)}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <Share className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">WhatsApp</span>
          </button>

          <button
            type="button"
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            disabled={!finalShareUrl}
            onClick={() => openExternalShare(facebookHref)}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <Facebook className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">Facebook</span>
          </button>

          <button
            type="button"
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            disabled={!finalShareUrl}
            onClick={() => openExternalShare(xHref)}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <X className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">X</span>
          </button>

          <button
            type="button"
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            disabled={!finalShareUrl}
            onClick={() => openExternalShare(emailHref)}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <Mail className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">Email</span>
          </button>

          <button
            type="button"
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            disabled={!finalShareUrl}
            onClick={handleCopyShareLink}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <Link2 className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">Copy</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Input readOnly value={finalShareUrl} className="rounded-full" />
          <Button onClick={handleCopyShareLink} disabled={!finalShareUrl} className="rounded-full">
            Copy
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            id="share-start-at"
            type="checkbox"
            checked={startAtEnabled}
            onChange={(e) => setStartAtEnabled(e.target.checked)}
            className="h-4 w-4 rounded border border-input bg-background text-primary"
          />
          <label htmlFor="share-start-at" className="text-sm text-muted-foreground">
            Start at
          </label>
          <Input
            type="number"
            min={0}
            value={currentStartAtSeconds}
            onChange={(e) => setCurrentStartAtSeconds(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={!startAtEnabled}
            className="w-20 h-8"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
