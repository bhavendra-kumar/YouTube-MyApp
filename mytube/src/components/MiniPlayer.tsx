import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { X, ChevronDown, Maximize2 } from "lucide-react";

type MiniPlayerVideo = {
  _id: string;
  videotitle?: string;
  videochanel?: string;
  filepath?: string;
  thumbnailUrl?: string;
};

// Mini player state — stored outside component so it persists across route changes
let globalMiniVideo: MiniPlayerVideo | null = null;
let listeners: Array<(v: MiniPlayerVideo | null) => void> = [];

export function setMiniPlayerVideo(video: MiniPlayerVideo | null) {
  globalMiniVideo = video;
  listeners.forEach((fn) => fn(video));
}

export function useMiniPlayer() {
  const [video, setVideo] = useState<MiniPlayerVideo | null>(globalMiniVideo);
  useEffect(() => {
    listeners.push(setVideo);
    return () => { listeners = listeners.filter((fn) => fn !== setVideo); };
  }, []);
  return { video, setVideo: setMiniPlayerVideo };
}

export default function MiniPlayer() {
  const { video } = useMiniPlayer();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  // Close mini player when navigating back to watch page
  useEffect(() => {
    if (router.pathname.startsWith("/watch") && video?._id && router.query.id === video._id) {
      setMiniPlayerVideo(null);
    }
  }, [router.pathname, router.query.id, video]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: position.x, py: position.y };
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPosition({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  if (!video) return null;

  return (
    <div
      className="fixed z-100 rounded-xl overflow-hidden shadow-2xl border border-border bg-black"
      style={{
        width: 320,
        bottom: position.y === 0 ? 80 : undefined,
        right: position.x === 0 ? 16 : undefined,
        top: position.y !== 0 ? `${window.innerHeight - 220 + position.y}px` : undefined,
        left: position.x !== 0 ? `${window.innerWidth - 336 + position.x}px` : undefined,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      {/* Video */}
      <div className="relative aspect-video bg-black" onMouseDown={onMouseDown}>
        {video.filepath ? (
          <video
            ref={videoRef}
            src={video.filepath}
            autoPlay
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <span className="text-white/40 text-sm">No video source</span>
          </div>
        )}

        {/* Controls overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Link
            href={`/watch/${video._id}`}
            onClick={() => setMiniPlayerVideo(null)}
            className="h-7 w-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
            title="Open in full"
          >
            <Maximize2 className="h-3.5 w-3.5 text-white" />
          </Link>
          <button
            type="button"
            onClick={() => setMiniPlayerVideo(null)}
            className="h-7 w-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors"
            aria-label="Close mini player"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Title bar */}
      <div className="bg-card px-3 py-2" onMouseDown={onMouseDown}>
        <p className="text-xs font-medium line-clamp-1 text-foreground">{video.videotitle}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-1">{video.videochanel}</p>
      </div>
    </div>
  );
}
