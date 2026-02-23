import Comments from "@/components/Comments";
import ErrorState from "@/components/ErrorState";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

import WatchPageSkeleton from "@/features/watch/components/WatchPageSkeleton";
import { useWatchPageData } from "@/features/watch/hooks/useWatchPageData";

const index = () => {
  const router = useRouter();
  const { id } = router.query;

  const videoId = router.isReady && typeof id === "string" ? id : null;
  const { video: currentVideo, relatedVideos, loading, error, reload } = useWatchPageData<any>(videoId);

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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer video={currentVideo} />
            <VideoInfo video={currentVideo} />
            <Comments videoId={videoId} />
          </div>
          <div className="space-y-4">
            <h2 className="font-semibold">Related Videos</h2>
            <RelatedVideos videos={relatedVideos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;