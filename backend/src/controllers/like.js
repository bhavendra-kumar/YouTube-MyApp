import Video from "../models/video.js";
import Like from "../models/like.js";
import Dislike from "../models/dislike.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { withMediaUrls } from "../utils/mediaUrl.js";

const VIDEO_LIST_SELECT =
  "videotitle filepath thumbnailUrl videochanel views createdAt duration category contentType isShort uploader Like Dislike commentsCount trendingScore";

async function syncCounts(videoId) {
  const [likesCount, dislikesCount] = await Promise.all([
    Like.countDocuments({ videoid: videoId }),
    Dislike.countDocuments({ videoid: videoId }),
  ]);

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: { Like: likesCount, Dislike: dislikesCount } },
    { new: true }
  )
    .select("Like Dislike")
    .lean();

  return {
    likesCount,
    dislikesCount,
    video: updatedVideo,
  };
}

export const handlelike = async (req, res) => {
  const userId = req.user?.id || req.body.userId;
  const { videoId } = req.params;
  const reactionType = String(req.body?.type || "like").toLowerCase();

  if (!userId) {
    throw new AppError("userId is required", 400);
  }

  if (req.user?.id && req.body?.userId && String(req.user.id) !== String(req.body.userId)) {
    throw new AppError("userId does not match token", 403);
  }

  const videoExists = await Video.findById(videoId).select("_id").lean();
  if (!videoExists) {
    throw new AppError("Video not found", 404);
  }

  const type = reactionType === "dislike" ? "dislike" : "like";

  // Ensure mutual exclusivity by deleting the opposite reaction.
  // Then, implement toggle behavior:
  // - clicking same reaction removes it
  // - clicking opposite removes opposite and adds requested
  let liked = false;
  let disliked = false;

  try {
    if (type === "like") {
      const removedLike = await Like.findOneAndDelete({ viewer: userId, videoid: videoId });
      await Dislike.findOneAndDelete({ viewer: userId, videoid: videoId });

      if (removedLike) {
        liked = false;
        disliked = false;
      } else {
        try {
          await Like.create({ viewer: userId, videoid: videoId });
        } catch (err) {
          if (err?.code !== 11000) throw err;
        }
        liked = true;
        disliked = false;
      }
    } else {
      const removedDislike = await Dislike.findOneAndDelete({ viewer: userId, videoid: videoId });
      await Like.findOneAndDelete({ viewer: userId, videoid: videoId });

      if (removedDislike) {
        liked = false;
        disliked = false;
      } else {
        try {
          await Dislike.create({ viewer: userId, videoid: videoId });
        } catch (err) {
          if (err?.code !== 11000) throw err;
        }
        liked = false;
        disliked = true;
      }
    }
  } catch (err) {
    throw new AppError(err?.message || "Failed to update reaction", 500);
  }

  const { likesCount, dislikesCount, video } = await syncCounts(videoId);

  const io = req.app.get("io");
  io?.to(`video:${videoId}`).emit("like:updated", { videoId, likes: likesCount });
  io?.to(`video:${videoId}`).emit("dislike:updated", { videoId, dislikes: dislikesCount });

  return sendSuccess(
    res,
    {
      liked,
      disliked,
      likesCount,
      dislikesCount,
      // Backward-compatible keys
      likes: likesCount,
      dislikes: dislikesCount,
      videoLike: video?.Like ?? likesCount,
      videoDislike: video?.Dislike ?? dislikesCount,
    },
    200
  );
};

export const getReactionStatus = async (req, res) => {
  const { userId: userIdParam, videoId } = req.params;
  const userId = req.user?.id || userIdParam;
  if (!userId || !videoId) {
    throw new AppError("userId and videoId are required", 400);
  }

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const [likedDoc, dislikedDoc] = await Promise.all([
    Like.findOne({ viewer: userId, videoid: videoId }).select("_id").lean(),
    Dislike.findOne({ viewer: userId, videoid: videoId }).select("_id").lean(),
  ]);

  return sendSuccess(
    res,
    {
      liked: Boolean(likedDoc),
      disliked: Boolean(dislikedDoc),
    },
    200
  );
};

export const getallLikedVideo = async (req, res) => {
  const { userId: userIdParam } = req.params;
  const userId = req.user?.id || userIdParam;
  if (!userId) {
    throw new AppError("userId is required", 400);
  }

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const limit = Math.min(limitUncapped, 50);
  const skip = (page - 1) * limit;

  const likevideo = await Like.find({ viewer: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "videoid",
      model: "videofiles",
      select: VIDEO_LIST_SELECT,
    })
    .lean();

  const items = Array.isArray(likevideo)
    ? likevideo.map((row) => ({
        ...row,
        videoid: row?.videoid ? withMediaUrls(row.videoid, req) : row?.videoid,
      }))
    : [];

  return sendSuccess(res, items, 200);
};
