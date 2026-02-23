import Video from "../models/video.js";
import History from "../models/history.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const handlehistory = async (req, res) => {
  const userId = req.user?.id || req.body.userId;
  const { videoId } = req.params;

  if (!userId) {
    throw new AppError("userId is required", 400);
  }

  if (req.user?.id && req.body?.userId && String(req.user.id) !== String(req.body.userId)) {
    throw new AppError("userId does not match token", 403);
  }

  // Prevent duplicates: keep a single history row per (viewer, videoid).
  // If it already exists, bump updatedAt so it sorts as most recent.
  const existing = await History.findOne({ viewer: userId, videoid: videoId }).select("_id");

  if (existing?._id) {
    await History.findByIdAndUpdate(existing._id, { $set: { updatedAt: new Date() } });
    return sendSuccess(res, { history: true, updated: true }, 200);
  }

  await History.create({ viewer: userId, videoid: videoId });
  return sendSuccess(res, { history: true, created: true }, 200);
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;
  await Video.findById(videoId).select("_id");
  return sendSuccess(res, { viewed: true }, 200);
};

export const getallhistoryVideo = async (req, res) => {
  const { userId: userIdParam } = req.params;
  const userId = req.user?.id || userIdParam;

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const historyvideo = await History.find({ viewer: userId })
    .sort({ updatedAt: -1 })
    .populate({
      path: "videoid",
      model: "videofiles",
    })
    .exec();

  return sendSuccess(res, historyvideo, 200);
};

export const deleteHistoryItem = async (req, res) => {
  const userId = req.user?.id;
  const { historyId } = req.params;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!historyId) {
    throw new AppError("historyId is required", 400);
  }

  const item = await History.findById(historyId).select("_id viewer");
  if (!item) {
    throw new AppError("History item not found", 404);
  }

  if (String(item.viewer) !== String(userId)) {
    throw new AppError("Forbidden", 403);
  }

  await History.findByIdAndDelete(historyId);
  return sendSuccess(res, { removed: true }, 200);
};

export const clearHistory = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const result = await History.deleteMany({ viewer: userId });
  const deletedCount = Number(result?.deletedCount ?? 0);

  return sendSuccess(res, { cleared: true, deletedCount }, 200);
};
