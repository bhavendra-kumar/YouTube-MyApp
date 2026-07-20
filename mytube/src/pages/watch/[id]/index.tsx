import Head from "next/head";
import Comments from "@/components/Comments";
import ErrorState from "@/components/ErrorState";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import UpgradeToPremiumButton from "@/components/UpgradeToPremiumButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/context/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";

import WatchPageSkeleton from "@/features/watch/components/WatchPageSkeleton";
import { useWatchPageData } from "@/features/watch/hooks/useWatchPageData";
import { cn } from "@/lib/utils";

type WatchQueueState = {
  ids: string[];
  index: number;
};

const WATCH_QUEUE_KEY = "yt:watchQueue";

function readWatchQueue(): WatchQueueState {
  if (typeof window === "undefined") return { ids: [], index: -1 };
  try {
    const raw = window.sessionStorage.getItem(WATCH_QUEUE_KEY);
    if (!raw) return { ids: [], index: -1 };
    const parsed = JSON.parse(raw) as Partial<WatchQueueState>;
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter(Boolean) : [];
    const index = typeof parsed.index === "number" ? parsed.index : ids.length - 1;
    return {
      ids,
      index: Math.max(-1, Math.min(index, ids.length - 1)),
    };
  } catch {
    return { ids: [], index: -1 };
  }
}

function writeWatchQueue(next: WatchQueueState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(WATCH_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const index = () => {
  const router = useRouter();
  const { id } = router.query;

  const { user } = useUser();

  const [theaterMode, setTheaterMode] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [watchLimitOpen, setWatchLimitOpen] = useState(false);

  const videoId = router.isReady && typeof id === "string" ? id : null;
  const { video: currentVideo, relatedVideos, loading, error, reload } = useWatchPageData<any>(videoId);

  const watchLimitSeconds = useMemo(() => {
    const plan = String(user?.plan || "FREE").toUpperCase();
    if (plan === "GOLD" || plan === "PREMIUM") return null;
    if (plan === "SILVER") return 10 * 60;
    if (plan === "BRONZE") return 7 * 60;
    return 5 * 60; // FREE
  }, [user?.plan]);

  const watchLimitLabel = useMemo(() => {
    if (watchLimitSeconds == null) return "Unlimited";
    const min = Math.floor(watchLimitSeconds / 60);
    return `${min} minutes per video`;
  }, [watchLimitSeconds]);

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    setPlaybackSeconds(0);
    setWatchLimitOpen(false);
    const state = readWatchQueue();

    // If the video exists somewhere in the queue, move pointer to it.
    const existingIndex = state.ids.indexOf(videoId);
    let ids = state.ids;
    let index = state.index;

    if (existingIndex >= 0) {
      index = existingIndex;
    } else {
      // Normal navigation: truncate forward history and append.
      const safeIndex = Math.max(-1, Math.min(index, ids.length - 1));
      const prefix = safeIndex >= 0 ? ids.slice(0, safeIndex + 1) : [];
      ids = [...prefix, videoId];
      index = ids.length - 1;

      // Cap memory
      if (ids.length > 50) {
        const drop = ids.length - 50;
        ids = ids.slice(drop);
        index = Math.max(0, index - drop);
      }
    }

    const nextState = { ids, index };
    writeWatchQueue(nextState);

    setCanPrev(index > 0);
    setCanNext(index < ids.length - 1 || (Array.isArray(relatedVideos) && relatedVideos.length > 0));
  }, [videoId, relatedVideos]);

  useEffect(() => {
    // If the user upgrades while the modal is open, dismiss it.
    if (watchLimitOpen && watchLimitSeconds == null) {
      setWatchLimitOpen(false);
    }
  }, [watchLimitOpen, watchLimitSeconds]);

  const goPrev = () => {
    const state = readWatchQueue();
    if (state.index <= 0) return;
    const target = state.ids[state.index - 1];
    if (!target) return;
    void router.push(`/watch/${target}`);
  };

  const goNext = () => {
    const state = readWatchQueue();
    const nextFromQueue = state.index >= 0 && state.index < state.ids.length - 1 ? state.ids[state.index + 1] : null;
    const nextFromRelated = Array.isArray(relatedVideos) && relatedVideos.length > 0 ? relatedVideos[0]?._id : null;
    const target = nextFromQueue || nextFromRelated;
    if (!target) return;
    void router.push(`/watch/${target}`);
  };

  useEffect(() => {
    const onUploaded = (event: Event) => {
      const detail = (event as CustomEvent<{ video?: any }>).detail;
      const uploaded = detail?.video;
      if (!uploaded || !uploaded._id) return;

      // Best-effort refresh related list if user is watching.
      reload();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("video:uploaded", onUploaded as EventListener);
      return () => {
        window.removeEventListener("video:uploaded", onUploaded as EventListener);
      };
    }
  }, [reload]);
  // const relatedVideos = [
  //   {
  //     _id: "1",
  //     videotitle: "Amazing Nature Documentary",
  //     filename: "nature-doc.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/nature-doc.mp4",
  //     filesize: "500MB",
  //     videochanel: "Nature Channel",
  //     Like: 1250,
  //     Dislike: 50,
  //     views: 45000,
  //     uploader: "nature_lover",
  //     createdAt: new Date().toISOString(),
  //   },
  //   {
  //     _id: "2",
  //     videotitle: "Cooking Tutorial: Perfect Pasta",
  //     filename: "pasta-tutorial.mp4",
  //     filetype: "video/mp4",
  //     filepath: "/videos/pasta-tutorial.mp4",
  //     filesize: "300MB",
  //     videochanel: "Chef's Kitchen",
  //     Like: 890,
  //     Dislike: 20,
  //     views: 23000,
  //     uploader: "chef_master",
  //     createdAt: new Date(Date.now() - 86400000).toISOString(),
  //   },
  // ];
  if (loading) return <WatchPageSkeleton />;

  if (error) {
    return (
      <div className="flex-1 p-4">
        <div className="max-w-4xl">
          <ErrorState title="Couldn’t load video" message={error} onRetry={reload} />
        </div>
      </div>
    );
  }
  
  if (!currentVideo) {
    return (
      <div className="flex-1 p-4">
        <div className="max-w-4xl">
          <ErrorState title="Video not found" message="This video may have been removed." />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{currentVideo?.videotitle ? `${currentVideo.videotitle} - MyTube` : "Watch - MyTube"}</title>
        <meta name="description" content={`Watch ${currentVideo?.videotitle ?? "video"} on MyTube by ${currentVideo?.videochanel ?? ""}`} />
        <meta property="og:title" content={currentVideo?.videotitle ?? "MyTube"} />
        <meta property="og:image" content={currentVideo?.thumbnailUrl ?? ""} />
        <meta property="og:type" content="video.other" />
      </Head>

      <main className="flex-1 min-w-0">
        <div className="yt-watch-layout">
          {/* Primary column — player + info + comments */}
          <div className={cn("yt-watch-primary space-y-4 min-w-0", theaterMode && "lg:col-span-full")}>
            <Videopplayer
              video={currentVideo}
              theaterMode={theaterMode}
              onTheaterModeChange={setTheaterMode}
              onPrev={goPrev}
              onNext={goNext}
              canPrev={canPrev}
              canNext={canNext}
              onPlaybackTimeChange={setPlaybackSeconds}
              watchLimitSeconds={watchLimitSeconds}
              onWatchLimitReached={() => setWatchLimitOpen(true)}
            />

            <Dialog open={watchLimitOpen} onOpenChange={setWatchLimitOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Watch limit reached</DialogTitle>
                  <DialogDescription>
                    Your current plan allows {watchLimitLabel}. Upgrade to keep watching.
                  </DialogDescription>
                </DialogHeader>
                <UpgradeToPremiumButton />
              </DialogContent>
            </Dialog>

            <VideoInfo video={currentVideo} currentTimeSeconds={playbackSeconds} />

            <div id="comments">
              <Comments videoId={videoId} />
            </div>

            {/* Related videos in theater mode — shown inline below comments */}
            {theaterMode && Array.isArray(relatedVideos) && relatedVideos.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold">Related</h2>
                <RelatedVideos videos={relatedVideos} />
              </div>
            )}
          </div>

          {/* Secondary column — related videos (hidden in theater mode) */}
          {!theaterMode && (
            <div className="yt-watch-secondary">
              <RelatedVideos videos={Array.isArray(relatedVideos) ? relatedVideos : []} />
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default index;