import Comments from "@/components/Comments";
import ErrorState from "@/components/ErrorState";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

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

  const [theaterMode, setTheaterMode] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);

  const videoId = router.isReady && typeof id === "string" ? id : null;
  const { video: currentVideo, relatedVideos, loading, error, reload } = useWatchPageData<any>(videoId);

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!videoId) return;
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
    <main className="flex-1">
      <div className="mx-auto w-full max-w-7xl p-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-6 min-w-0",
            theaterMode ? "lg:grid-cols-1" : "lg:grid-cols-3"
          )}
        >
          <div className={cn("space-y-4 min-w-0", theaterMode ? "" : "lg:col-span-2")}>
            <Videopplayer
              video={currentVideo}
              theaterMode={theaterMode}
              onTheaterModeChange={setTheaterMode}
              onPrev={goPrev}
              onNext={goNext}
              canPrev={canPrev}
              canNext={canNext}
              onPlaybackTimeChange={setPlaybackSeconds}
            />
            <VideoInfo video={currentVideo} currentTimeSeconds={playbackSeconds} />
            <div id="comments">
              <Comments videoId={videoId} />
            </div>

            {theaterMode ? (
              <div className="space-y-4">
                <h2 className="font-semibold">Related Videos</h2>
                <RelatedVideos videos={relatedVideos} />
              </div>
            ) : null}
          </div>

          {!theaterMode ? (
            <div className="space-y-4 min-w-0">
              <h2 className="font-semibold">Related Videos</h2>
              <RelatedVideos videos={relatedVideos} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default index;