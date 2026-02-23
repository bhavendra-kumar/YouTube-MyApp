import WatchLater from "../models/watchlater.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

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
  });

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

  const watchlatervideo = await WatchLater.find({ viewer: userId })
    .sort({ updatedAt: -1 })
    .populate({
      path: "videoid",
      model: "videofiles",
    })
    .exec();

  return sendSuccess(res, watchlatervideo, 200);
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

  const existing = await WatchLater.findOne({ viewer: userId, videoid: videoId }).select(
    "_id"
  );
  return sendSuccess(res, { watchlater: Boolean(existing) }, 200);
};
