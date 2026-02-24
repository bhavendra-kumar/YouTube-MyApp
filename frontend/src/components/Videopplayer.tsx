"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  Monitor,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

import { buildMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    sources?: Array<{
      src: string;
      label: string;
      type?: string;
    }>;
    captions?: Array<{
      src: string;
      label: string;
      lang: string;
      default?: boolean;
    }>;
  };
  theaterMode?: boolean;
  onTheaterModeChange?: (value: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VideoPlayer({
  video,
  theaterMode: theaterModeProp,
  onTheaterModeChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [lastVolume, setLastVolume] = useState(1);

  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const wasPlayingRef = useRef(false);

  const [internalTheater, setInternalTheater] = useState(false);
  const theaterMode = theaterModeProp ?? internalTheater;
  const setTheaterMode = onTheaterModeChange ?? setInternalTheater;

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [playbackRate, setPlaybackRate] = useState(1);

  const [speedBoost, setSpeedBoost] = useState(false);
  const speedBoostRef = useRef(false);
  useEffect(() => {
    speedBoostRef.current = speedBoost;
  }, [speedBoost]);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressActiveRef = useRef(false);
  const mouseClickTimerRef = useRef<number | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"root" | "speed" | "quality" | "captions">("root");

  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const [activeQualityLabel, setActiveQualityLabel] = useState<string>("Auto");
  const pendingQualityRef = useRef<{ time: number; shouldPlay: boolean; rate: number } | null>(null);

  const [captionsOn, setCaptionsOn] = useState(false);
  const [activeCaptionLang, setActiveCaptionLang] = useState<string | null>(null);

  const lastTouchRef = useRef<{ time: number; x: number } | null>(null);
  const [seekToast, setSeekToast] = useState<string | null>(null);
  const seekToastTimerRef = useRef<number | null>(null);

  const sources = useMemo(() => {
    const raw = Array.isArray(video?.sources) ? video.sources : [];
    if (raw.length > 0) {
      return raw
        .filter((s) => Boolean(String(s?.src || "").trim()))
        .map((s) => ({
          src: buildMediaUrl(s.src),
          label: String(s.label || "Quality").trim() || "Quality",
          type: s.type || "video/mp4",
        }));
    }
    return [{ src: buildMediaUrl(video?.filepath), label: "Auto", type: "video/mp4" }];
  }, [video?.filepath, video?.sources]);

  const captions = useMemo(() => {
    const raw = Array.isArray(video?.captions) ? video.captions : [];
    return raw
      .filter((t) => Boolean(String(t?.src || "").trim()) && Boolean(String(t?.lang || "").trim()))
      .map((t) => ({
        src: buildMediaUrl(t.src),
        label: String(t.label || t.lang).trim() || t.lang,
        lang: String(t.lang).trim(),
        default: Boolean(t.default),
      }));
  }, [video?.captions]);

  const [activeSource, setActiveSource] = useState(() => sources[0]?.src || "");

  useEffect(() => {
    setActiveSource(sources[0]?.src || "");
    setActiveQualityLabel(sources[0]?.label || "Auto");
  }, [sources]);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const clearSeekToast = () => {
    if (seekToastTimerRef.current) {
      window.clearTimeout(seekToastTimerRef.current);
      seekToastTimerRef.current = null;
    }
    setSeekToast(null);
  };

  const showSeekToast = (text: string) => {
    clearSeekToast();
    setSeekToast(text);
    seekToastTimerRef.current = window.setTimeout(() => {
      setSeekToast(null);
      seekToastTimerRef.current = null;
    }, 700);
  };

  const scheduleHide = () => {
    clearHideTimer();
    if (!isPlaying) return;
    if (settingsOpen) return;
    hideTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

  const syncFromVideo = () => {
    const el = videoRef.current;
    if (!el) return;
    setIsPlaying(!el.paused);
    setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    setCurrentTime(Number.isFinite(el.currentTime) ? el.currentTime : 0);
    setIsMuted(Boolean(el.muted));
    setVolume(typeof el.volume === "number" ? el.volume : 1);
    const nextRate = typeof el.playbackRate === "number" ? el.playbackRate : 1;
    // Don't overwrite user's chosen rate during temporary speed boost.
    if (!speedBoostRef.current) {
      setPlaybackRate(nextRate);
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearMouseClickTimer = () => {
    if (mouseClickTimerRef.current) {
      window.clearTimeout(mouseClickTimerRef.current);
      mouseClickTimerRef.current = null;
    }
  };

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;

    try {
      if (el.paused) {
        await el.play();
      } else {
        el.pause();
      }
    } catch {
      // ignore autoplay/play promise issues
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.muted || el.volume === 0) {
      el.muted = false;
      const next = lastVolume > 0 ? lastVolume : 1;
      el.volume = next;
      setVolume(next);
      setIsMuted(false);
    } else {
      setLastVolume(el.volume);
      el.muted = true;
      setIsMuted(true);
    }
  };

  const setVideoVolume = (next: number) => {
    const el = videoRef.current;
    if (!el) return;

    const clamped = Math.min(1, Math.max(0, next));
    el.volume = clamped;
    if (clamped === 0) {
      el.muted = true;
      setIsMuted(true);
    } else {
      el.muted = false;
      setIsMuted(false);
      setLastVolume(clamped);
    }
    setVolume(clamped);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    const videoEl = videoRef.current as unknown as {
      webkitEnterFullscreen?: () => void;
    };

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (el?.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }
      // iOS Safari fallback (video element)
      if (videoEl?.webkitEnterFullscreen) {
        videoEl.webkitEnterFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const onScrubStart = () => {
    const el = videoRef.current;
    if (!el) return;
    wasPlayingRef.current = !el.paused;
    setIsScrubbing(true);
    setScrubTime(el.currentTime);
    el.pause();
  };

  const onScrubEnd = (nextTime: number) => {
    const el = videoRef.current;
    if (!el) return;

    el.currentTime = nextTime;
    setCurrentTime(nextTime);
    setScrubTime(null);
    setIsScrubbing(false);
    if (wasPlayingRef.current) {
      void el.play();
    }
  };

  useEffect(() => {
    syncFromVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Apply playback speed (with optional temporary boost)
    el.playbackRate = speedBoost ? 2 : playbackRate;
  }, [playbackRate, speedBoost]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Apply captions selection
    try {
      const tracks = el.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const lang = String(track.language || "");
        const shouldShow = captionsOn && activeCaptionLang && lang === activeCaptionLang;
        track.mode = shouldShow ? "showing" : "disabled";
      }
    } catch {
      // ignore
    }
  }, [activeCaptionLang, captionsOn]);

  useEffect(() => {
    // Quality switching: set src imperatively so the browser reloads.
    const el = videoRef.current;
    if (!el) return;
    if (!activeSource) return;

    const shouldPlay = !el.paused;
    const time = Number.isFinite(el.currentTime) ? el.currentTime : 0;
    pendingQualityRef.current = { time, shouldPlay, rate: playbackRate };

    try {
      el.src = activeSource;
      el.load();
    } catch {
      // ignore
    }
  }, [activeSource]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      clearHideTimer();
      return;
    }
    scheduleHide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    if (!settingsOpen) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = settingsPanelRef.current;
      const btn = settingsButtonRef.current;
      if (panel?.contains(target) || btn?.contains(target)) return;

      setSettingsOpen(false);
      setSettingsView("root");
      scheduleHide();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        setSettingsView("root");
        scheduleHide();
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  useEffect(() => {
    return () => {
      clearHideTimer();
      clearSeekToast();
      clearLongPressTimer();
      clearMouseClickTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seekTo = (nextTime: number) => {
    const el = videoRef.current;
    if (!el) return;
    const safeDuration = Number.isFinite(el.duration) ? el.duration : duration;
    const clamped = Math.min(Math.max(0, nextTime), Math.max(0, safeDuration || 0));
    el.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const seekBy = (deltaSeconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    const base = Number.isFinite(el.currentTime) ? el.currentTime : currentTime;
    seekTo(base + deltaSeconds);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(target?.isContentEditable);
      if (isEditable) return;

      // If the player is not on the page, ignore.
      if (!containerRef.current) return;

      const key = e.key.toLowerCase();

      // YouTube-like shortcuts
      if (key === " " || key === "k") {
        e.preventDefault();
        void togglePlay();
        return;
      }

      if (key === "j") {
        seekBy(-10);
        showSeekToast("-10s");
        return;
      }

      if (key === "l") {
        seekBy(10);
        showSeekToast("+10s");
        return;
      }

      if (key === "arrowleft") {
        e.preventDefault();
        seekBy(-5);
        showSeekToast("-5s");
        return;
      }

      if (key === "arrowright") {
        e.preventDefault();
        seekBy(5);
        showSeekToast("+5s");
        return;
      }

      if (key === "arrowup") {
        e.preventDefault();
        setVideoVolume(volume + 0.05);
        return;
      }

      if (key === "arrowdown") {
        e.preventDefault();
        setVideoVolume(volume - 0.05);
        return;
      }

      if (key === "m") {
        toggleMute();
        return;
      }

      if (key === "c") {
        // Captions toggle
        if (captions.length === 0) return;
        if (!captionsOn) {
          const nextLang = activeCaptionLang || captions.find((t) => t.default)?.lang || captions[0]?.lang;
          setActiveCaptionLang(nextLang || null);
          setCaptionsOn(true);
          showSeekToast("Captions on");
        } else {
          setCaptionsOn(false);
          showSeekToast("Captions off");
        }
        return;
      }

      if (key === "f") {
        void toggleFullscreen();
        return;
      }

      if (key === "t") {
        setTheaterMode(!theaterMode);
      }

      if (key === "escape") {
        if (settingsOpen) {
          setSettingsOpen(false);
          setSettingsView("root");
          scheduleHide();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theaterMode, volume, duration, currentTime, isMuted, isPlaying, captions.length, captionsOn, activeCaptionLang, settingsOpen]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video overflow-hidden bg-black",
        theaterMode
          ? "-mx-4 sm:-mx-4 sm:rounded-none"
          : "-mx-4 sm:mx-0 sm:rounded-xl"
      )}
      tabIndex={0}
      onPointerDown={(e) => {
        containerRef.current?.focus();
        setShowControls(true);
        clearHideTimer();

        // Long press (touch/pen): temporary 2x.
        clearLongPressTimer();
        longPressActiveRef.current = false;

        if (e.pointerType !== "mouse") {
          longPressTimerRef.current = window.setTimeout(() => {
            longPressTimerRef.current = null;
            longPressActiveRef.current = true;
            setSpeedBoost(true);
            showSeekToast("2x");
          }, 420);
        }
      }}
      onPointerCancel={() => {
        clearLongPressTimer();
        if (longPressActiveRef.current) {
          longPressActiveRef.current = false;
          setSpeedBoost(false);
        }
      }}
      onPointerUp={(e) => {
        clearLongPressTimer();

        // If we were speed-boosting via long press, end it and do nothing else.
        if (longPressActiveRef.current) {
          longPressActiveRef.current = false;
          setSpeedBoost(false);
          scheduleHide();
          return;
        }

        // Mouse: delay toggle slightly so double-click can be used for fullscreen.
        if (e.pointerType === "mouse") {
          if ((e as any).button != null && (e as any).button !== 0) return;
          clearMouseClickTimer();
          mouseClickTimerRef.current = window.setTimeout(() => {
            mouseClickTimerRef.current = null;
            void togglePlay();
          }, 200);
          return;
        }

        // Touch: single tap toggles play/pause, double tap seeks.
        const rect = containerRef.current?.getBoundingClientRect();
        const x = rect ? e.clientX - rect.left : e.clientX;
        const now = Date.now();
        const last = lastTouchRef.current;

        if (last && now - last.time < 300 && Math.abs(x - last.x) < 40) {
          lastTouchRef.current = null;
          const isLeft = rect ? x < rect.width / 2 : x < window.innerWidth / 2;
          if (isLeft) {
            seekBy(-10);
            showSeekToast("-10s");
          } else {
            seekBy(10);
            showSeekToast("+10s");
          }
          setShowControls(true);
          scheduleHide();
          return;
        }

        lastTouchRef.current = { time: now, x };
        window.setTimeout(() => {
          if (lastTouchRef.current?.time !== now) return;
          lastTouchRef.current = null;
          void togglePlay();
          setShowControls(true);
          scheduleHide();
        }, 310);
      }}
      onMouseMove={() => {
        setShowControls(true);
        scheduleHide();
      }}
      onMouseLeave={() => {
        if (!isPlaying) return;
        if (settingsOpen) return;
        setShowControls(false);
        clearHideTimer();
      }}
      onDoubleClick={() => {
        // Cancel pending single-click toggle so double-click is only fullscreen.
        clearMouseClickTimer();
        void toggleFullscreen();
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        preload="metadata"
        poster={`/placeholder.svg?height=480&width=854`}
        onLoadedMetadata={() => {
          // Restore time/play after quality switch
          const pending = pendingQualityRef.current;
          if (pending) {
            pendingQualityRef.current = null;
            try {
              // Don't fight a temporary speed boost
              videoRef.current!.playbackRate = speedBoostRef.current ? 2 : pending.rate;
              videoRef.current!.currentTime = pending.time;
              if (pending.shouldPlay) {
                void videoRef.current!.play();
              }
            } catch {
              // ignore
            }
          }

          // Initialize captions default
          if (captions.length > 0 && activeCaptionLang == null) {
            const def = captions.find((t) => t.default)?.lang || captions[0]!.lang;
            setActiveCaptionLang(def);
            setCaptionsOn(false);
          }

          syncFromVideo();
        }}
        onTimeUpdate={() => {
          if (isScrubbing) return;
          syncFromVideo();
        }}
        onPlay={() => {
          setIsPlaying(true);
          scheduleHide();
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
          clearHideTimer();
        }}
        onVolumeChange={() => {
          syncFromVideo();
        }}
      >
        {/* Tracks are optional; browser will fetch VTT when enabled */}
        {captions.map((t) => (
          <track
            key={t.lang}
            kind="subtitles"
            srcLang={t.lang}
            label={t.label}
            src={t.src}
            default={Boolean(t.default)}
          />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Seek toast (mobile + keyboard) */}
      {seekToast ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
            {seekToast}
          </div>
        </div>
      ) : null}

      {/* Big play button when paused */}
      {!isPlaying ? (
        <button
          type="button"
          onClick={() => {
            void togglePlay();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play"
        >
          <span className="rounded-full bg-black/60 p-4 text-white">
            <Play className="h-8 w-8" fill="currentColor" />
          </span>
        </button>
      ) : null}

      {/* Controls overlay */}
      {showControls ? (
        <div className="absolute inset-0">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-2 text-white">
            {/* Progress */}
            <input
              aria-label="Seek"
              type="range"
              min={0}
              max={Math.max(duration, 0.0001)}
              step={0.1}
              value={scrubTime ?? currentTime}
              onMouseDown={onScrubStart}
              onTouchStart={onScrubStart}
              onChange={(e) => {
                const next = Number(e.target.value);
                setScrubTime(next);
              }}
              onMouseUp={(e) => {
                const next = Number((e.target as HTMLInputElement).value);
                onScrubEnd(next);
              }}
              onTouchEnd={(e) => {
                const target = e.target as HTMLInputElement;
                const next = Number(target.value);
                onScrubEnd(next);
              }}
              className="w-full accent-white"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            />

            <div className="mt-2 flex items-center gap-2">
              {/* Prev / Play / Next */}
              <button
                type="button"
                onClick={() => {
                  onPrev?.();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                disabled={!onPrev || canPrev === false}
                className={cn(
                  "rounded p-1 hover:bg-white/10",
                  !onPrev || canPrev === false ? "opacity-50" : ""
                )}
                aria-label="Previous video"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  void togglePlay();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="rounded p-1 hover:bg-white/10"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  onNext?.();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                disabled={!onNext || canNext === false}
                className={cn(
                  "rounded p-1 hover:bg-white/10",
                  !onNext || canNext === false ? "opacity-50" : ""
                )}
                aria-label="Next video"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              <div className="text-xs tabular-nums text-white/90">
                {formatTime(scrubTime ?? currentTime)} / {formatTime(duration)}
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Captions */}
                <button
                  type="button"
                  onClick={() => {
                    if (captions.length === 0) return;
                    if (!captionsOn) {
                      const nextLang = activeCaptionLang || captions.find((t) => t.default)?.lang || captions[0]?.lang;
                      setActiveCaptionLang(nextLang || null);
                      setCaptionsOn(true);
                      showSeekToast("Captions on");
                    } else {
                      setCaptionsOn(false);
                      showSeekToast("Captions off");
                    }
                    setShowControls(true);
                    setSettingsOpen(false);
                    setSettingsView("root");
                    scheduleHide();
                  }}
                  disabled={captions.length === 0}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-semibold hover:bg-white/10",
                    captionsOn ? "bg-white/10" : "",
                    captions.length === 0 ? "opacity-50" : ""
                  )}
                  aria-label={captionsOn ? "Disable captions" : "Enable captions"}
                  aria-pressed={captionsOn}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  CC
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded p-1 hover:bg-white/10"
                  aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>

                <input
                  aria-label="Volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVideoVolume(Number(e.target.value))}
                  className="hidden w-24 accent-white sm:block"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                />

                <button
                  type="button"
                  onClick={() => setTheaterMode(!theaterMode)}
                  className={cn(
                    "rounded p-1 hover:bg-white/10",
                    theaterMode ? "bg-white/10" : ""
                  )}
                  aria-label={theaterMode ? "Exit theater mode" : "Theater mode"}
                  aria-pressed={theaterMode}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  <Monitor className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void toggleFullscreen();
                  }}
                  className="rounded p-1 hover:bg-white/10"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  aria-pressed={isFullscreen}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>

                {/* Settings */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setSettingsView("root");
                          setShowControls(true);
                          clearHideTimer();
                        } else {
                          scheduleHide();
                        }
                        return next;
                      });
                    }}
                    className={cn(
                      "rounded p-1 hover:bg-white/10",
                      settingsOpen ? "bg-white/10" : ""
                    )}
                    aria-label="Settings"
                    aria-pressed={settingsOpen}
                    ref={settingsButtonRef}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                  >
                    <Settings className="h-5 w-5" />
                  </button>

                  {settingsOpen ? (
                    <div
                      ref={settingsPanelRef}
                      className="absolute bottom-10 right-0 w-56 overflow-hidden rounded-lg bg-zinc-900/95 text-white shadow-lg"
                      role="menu"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {settingsView === "root" ? (
                        <div className="p-2 text-sm">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-2 hover:bg-white/10"
                            onClick={() => setSettingsView("speed")}
                          >
                            <span>Playback speed</span>
                            <span className="text-white/70">{playbackRate}x</span>
                          </button>

                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded px-2 py-2 hover:bg-white/10",
                              sources.length <= 1 ? "opacity-60" : ""
                            )}
                            disabled={sources.length <= 1}
                            onClick={() => setSettingsView("quality")}
                          >
                            <span>Quality</span>
                            <span className="text-white/70">{activeQualityLabel}</span>
                          </button>

                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded px-2 py-2 hover:bg-white/10",
                              captions.length === 0 ? "opacity-60" : ""
                            )}
                            disabled={captions.length === 0}
                            onClick={() => setSettingsView("captions")}
                          >
                            <span>Captions</span>
                            <span className="text-white/70">{captionsOn ? "On" : "Off"}</span>
                          </button>
                        </div>
                      ) : null}

                      {settingsView === "speed" ? (
                        <div className="p-2 text-sm">
                          <div className="flex items-center justify-between px-2 py-2">
                            <button
                              type="button"
                              className="rounded px-2 py-1 hover:bg-white/10"
                              onClick={() => setSettingsView("root")}
                            >
                              Back
                            </button>
                            <div className="font-medium">Playback speed</div>
                            <div className="w-10" />
                          </div>

                          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                            <button
                              key={r}
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between rounded px-2 py-2 hover:bg-white/10",
                                playbackRate === r ? "bg-white/10" : ""
                              )}
                              onClick={() => {
                                setPlaybackRate(r);
                                showSeekToast(`${r}x`);
                                scheduleHide();
                              }}
                            >
                              <span>{r === 1 ? "Normal" : `${r}`}</span>
                              {playbackRate === r ? <span className="text-white/70">✓</span> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {settingsView === "quality" ? (
                        <div className="p-2 text-sm">
                          <div className="flex items-center justify-between px-2 py-2">
                            <button
                              type="button"
                              className="rounded px-2 py-1 hover:bg-white/10"
                              onClick={() => setSettingsView("root")}
                            >
                              Back
                            </button>
                            <div className="font-medium">Quality</div>
                            <div className="w-10" />
                          </div>

                          {sources.map((s) => (
                            <button
                              key={s.src}
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between rounded px-2 py-2 hover:bg-white/10",
                                activeSource === s.src ? "bg-white/10" : ""
                              )}
                              onClick={() => {
                                setActiveQualityLabel(s.label);
                                setActiveSource(s.src);
                                showSeekToast(s.label);
                                scheduleHide();
                              }}
                            >
                              <span>{s.label}</span>
                              {activeSource === s.src ? <span className="text-white/70">✓</span> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {settingsView === "captions" ? (
                        <div className="p-2 text-sm">
                          <div className="flex items-center justify-between px-2 py-2">
                            <button
                              type="button"
                              className="rounded px-2 py-1 hover:bg-white/10"
                              onClick={() => setSettingsView("root")}
                            >
                              Back
                            </button>
                            <div className="font-medium">Captions</div>
                            <div className="w-10" />
                          </div>

                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded px-2 py-2 hover:bg-white/10",
                              !captionsOn ? "bg-white/10" : ""
                            )}
                            onClick={() => {
                              setCaptionsOn(false);
                              showSeekToast("Captions off");
                              scheduleHide();
                            }}
                          >
                            <span>Off</span>
                            {!captionsOn ? <span className="text-white/70">✓</span> : null}
                          </button>

                          {captions.map((t) => (
                            <button
                              key={t.lang}
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between rounded px-2 py-2 hover:bg-white/10",
                                captionsOn && activeCaptionLang === t.lang ? "bg-white/10" : ""
                              )}
                              onClick={() => {
                                setActiveCaptionLang(t.lang);
                                setCaptionsOn(true);
                                showSeekToast("Captions on");
                                scheduleHide();
                              }}
                            >
                              <span>{t.label}</span>
                              {captionsOn && activeCaptionLang === t.lang ? (
                                <span className="text-white/70">✓</span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}