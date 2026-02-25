/**
 * Calculate a trending score for a video.
 *
 * Formula:
 * score = (views * 0.5 + Like * 0.3 + commentsCount * 0.2)
 *         / (hours_since_upload + 2)^1.5
 *
 * @param {object} video
 * @param {number} [nowMs]
 * @returns {number}
 */
export function calculateTrendingScore(video, nowMs = Date.now()) {
  const safeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const views = safeNumber(video?.views);
  const likes = safeNumber(video?.Like ?? video?.like);
  const commentsCount = safeNumber(video?.commentsCount);

  const createdAtRaw = video?.createdAt ?? video?.created_at ?? video?.uploadedAt;
  const createdAtMs = createdAtRaw ? new Date(createdAtRaw).getTime() : NaN;
  const hoursSinceUpload = Number.isFinite(createdAtMs)
    ? Math.max(0, (nowMs - createdAtMs) / (1000 * 60 * 60))
    : 0;

  const numerator = views * 0.5 + likes * 0.3 + commentsCount * 0.2;
  const denominator = Math.pow(hoursSinceUpload + 2, 1.5);

  const score = numerator / denominator;
  return Number.isFinite(score) ? score : 0;
}
