export default function VideoCardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Thumbnail skeleton */}
      <div className="aspect-video rounded-xl yt-skeleton" />
      {/* Info row */}
      <div className="flex gap-3">
        {/* Avatar skeleton */}
        <div className="w-9 h-9 rounded-full yt-skeleton shrink-0 mt-0.5" />
        {/* Text skeletons */}
        <div className="flex-1 space-y-2 pt-0.5">
          {/* Title lines - 16px */}
          <div className="h-4 yt-skeleton rounded w-full" />
          <div className="h-4 yt-skeleton rounded w-4/5" />
          {/* Channel / views lines - 14px */}
          <div className="h-3.5 yt-skeleton rounded w-1/2 mt-2" />
          <div className="h-3.5 yt-skeleton rounded w-2/5" />
        </div>
      </div>
    </div>
  );
}
