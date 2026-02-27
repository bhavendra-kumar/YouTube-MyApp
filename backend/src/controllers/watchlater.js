import WatchLater from "../models/watchlater.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { withMediaUrls } from "../utils/mediaUrl.js";

const VIDEO_LIST_SELECT =
  "videotitle filepath thumbnailUrl videochanel views createdAt duration category contentType isShort uploader Like Dislike commentsCount trendingScore";

export const handlewatchlater = async (req, res) => {
  const userId = req.user?.id || req.body.userId;
  const { videoId } = req.params;

  if (!userId) {
    throw new AppError("userId is required", 400);
  }

  if (req.user?.id && req.body?.userId && String(req.user.id) !== String(req.body.userId)) {
    throw new AppError("userId does not match token", 403);
  }

  const exisitingwatchlater = await WatchLater.findOne({
    viewer: userId,
    videoid: videoId,
  }).lean();

  if (exisitingwatchlater) {
    await WatchLater.findByIdAndDelete(exisitingwatchlater._id);
    return sendSuccess(res, { watchlater: false }, 200);
  }

  await WatchLater.create({ viewer: userId, videoid: videoId });
  return sendSuccess(res, { watchlater: true }, 200);
};

export const getallwatchlater = async (req, res) => {
  const { userId: userIdParam } = req.params;
  const userId = req.user?.id || userIdParam;

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const limit = Math.min(limitUncapped, 50);
  const skip = (page - 1) * limit;

  const watchlatervideo = await WatchLater.find({ viewer: userId })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "videoid",
      model: "videofiles",
      select: VIDEO_LIST_SELECT,
    })
    .lean();

  const items = Array.isArray(watchlatervideo)
    ? watchlatervideo.map((row) => ({
        ...row,
        videoid: row?.videoid ? withMediaUrls(row.videoid, req) : row?.videoid,
      }))
    : [];

  return sendSuccess(res, items, 200);
};

export const getWatchLaterStatus = async (req, res) => {
  const { userId: userIdParam, videoId } = req.params;
  const userId = req.user?.id || userIdParam;
  if (!userId || !videoId) {
    throw new AppError("userId and videoId are required", 400);
  }

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const existing = await WatchLater.findOne({ viewer: userId, videoid: videoId })
    .select("_id")
    .lean();
  return sendSuccess(res, { watchlater: Boolean(existing) }, 200);
};
