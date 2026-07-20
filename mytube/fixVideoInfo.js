const fs = require('fs');
let code = fs.readFileSync('src/components/VideoInfo.tsx', 'utf8');

const anchor1 = `    const wasIn = isVideoInPlaylist(current);
    const prev = playlists;`;

const anchor2 = `      if (lastHistoryKeyRef.current === key) return;
      lastHistoryKeyRef.current = key;`;

const missingCode = `
    // Optimistic update
    setPlaylists((items) =>
      items.map((p) => {
        if (String(p?._id) !== String(playlistId)) return p;
        const ids = Array.isArray(p?.videos) ? p.videos.map(String) : [];
        const vid = String(video._id);
        const nextIds = wasIn
          ? ids.filter((x) => x !== vid)
          : Array.from(new Set([...ids, vid]));
        return { ...p, videos: nextIds };
      })
    );

    try {
      setPlaylistBusyId(String(playlistId));
      if (wasIn) {
        await axiosClient.delete(\`/playlist/\${playlistId}/videos/\${video._id}\`);
        notify.success("Removed from playlist");
      } else {
        await axiosClient.post(\`/playlist/\${playlistId}/videos\`, { videoId: video._id });
        notify.success("Saved to playlist");
      }
    } catch (e) {
      console.error(e);
      setPlaylists(prev);
      notify.error(e?.response?.data?.message || "Could not update playlist");
    } finally {
      setPlaylistBusyId(null);
    }
  };

  useEffect(() => {
    if (!video?._id) return;

    const socket = getSocket();
    socket.connect();
    socket.emit("video:join", video._id);

    const onLikeUpdated = (payload) => {
      if (!payload || String(payload.videoId) !== String(video._id)) return;
      setlikes(payload.likes ?? 0);
    };

    const onDislikeUpdated = (payload) => {
      if (!payload || String(payload.videoId) !== String(video._id)) return;
      setDislikes(payload.dislikes ?? 0);
    };

    socket.on("like:updated", onLikeUpdated);
    socket.on("dislike:updated", onDislikeUpdated);

    return () => {
      socket.emit("video:leave", video._id);
      socket.off("like:updated", onLikeUpdated);
      socket.off("dislike:updated", onDislikeUpdated);
    };
  }, [video?._id]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!video?._id) return;

      try {
        if (video?.uploader) {
          const countRes = await axiosClient.get(\`/subscribe/count/\${video.uploader}\`);
          setSubscriberCount(Number(countRes.data?.subscribers ?? 0));
        } else {
          setSubscriberCount(0);
        }

        if (!user?._id) return;

        const [reactionRes, watchLaterRes, subscribeRes] = await Promise.all([
          axiosClient.get(\`/like/status/\${video._id}/\${user._id}\`),
          axiosClient.get(\`/watch/status/\${video._id}/\${user._id}\`),
          video?.uploader
            ? axiosClient.get(\`/subscribe/status/\${video.uploader}/\${user._id}\`)
            : Promise.resolve({ data: { subscribed: false, subscribers: 0 } }),
        ]);

        setIsLiked(Boolean(reactionRes.data?.liked));
        setIsDisliked(Boolean(reactionRes.data?.disliked));
        setIsWatchLater(Boolean(watchLaterRes.data?.watchlater));
        setIsSubscribed(Boolean(subscribeRes.data?.subscribed));
        if (typeof subscribeRes.data?.subscribers === "number") {
          setSubscriberCount(subscribeRes.data.subscribers);
        }
      } catch (e) {
        console.error("Failed to load video action status", e);
      }
    };

    loadStatus();
  }, [user?._id, video?._id, video?.uploader]);

  useEffect(() => {
    const handleviews = async () => {
      if (!video?._id) return;

      // Client-side idempotency guard to avoid duplicate rows due to re-renders.
`;

const startIdx = code.indexOf(anchor1);
const endIdx = code.indexOf(anchor2, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + anchor1 + missingCode + anchor2 + code.substring(endIdx + anchor2.length);
  fs.writeFileSync('src/components/VideoInfo.tsx', code);
  console.log("Fixed!");
} else {
  console.log("Anchors not found", startIdx, endIdx);
}
