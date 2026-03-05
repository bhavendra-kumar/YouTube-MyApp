import mongoose from "mongoose";

import User from "../models/user.js";
import Video from "../models/video.js";
import { AppError } from "../utils/AppError.js";

function startOfTodayUtc(now) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const canDownloadVideo = async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError("Unauthorized", 401));

  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return next(new AppError("Invalid video id", 400));
  }

  const video = await Video.findById(videoId)
    .select("_id videotitle filepath filetype filename")
    .lean();

  if (!video) return next(new AppError("Video not found", 404));

  const now = new Date();
  const todayStart = startOfTodayUtc(now);

  const historyEntry = {
    videoId: new mongoose.Types.ObjectId(videoId),
    downloadedAt: now,
  };

  // PREMIUM: always allowed.
  const premiumUpdated = await User.findOneAndUpdate(
    { _id: userId, plan: "PREMIUM" },
    {
      $set: { lastDownloadDate: now },
      $push: { downloadHistory: historyEntry },
    },
    { new: true }
  )
    .select("_id plan")
    .lean();

  if (!premiumUpdated) {
    // FREE (or legacy users without plan): allow only 1/day.

    // Case 1: new day (reset counter to 1)
    const newDayUpdated = await User.findOneAndUpdate(
      {
        _id: userId,
        $and: [
          { $or: [{ plan: "FREE" }, { plan: { $exists: false } }] },
          {
            $or: [
              { lastDownloadDate: { $lt: todayStart } },
              { lastDownloadDate: { $exists: false } },
              { lastDownloadDate: null },
            ],
          },
        ],
      },
      {
        $set: {
          plan: "FREE",
          downloadsToday: 1,
          lastDownloadDate: now,
        },
        $push: { downloadHistory: historyEntry },
      },
      { new: true }
    )
      .select("_id plan downloadsToday lastDownloadDate")
      .lean();

    if (!newDayUpdated) {
      // Case 2: same day; allow only if downloadsToday < 1
      const sameDayUpdated = await User.findOneAndUpdate(
        {
          _id: userId,
          $and: [
            { $or: [{ plan: "FREE" }, { plan: { $exists: false } }] },
            { lastDownloadDate: { $gte: todayStart } },
            { $or: [{ downloadsToday: { $lt: 1 } }, { downloadsToday: { $exists: false } }] },
          ],
        },
        {
          $set: { plan: "FREE", lastDownloadDate: now },
          $inc: { downloadsToday: 1 },
          $push: { downloadHistory: historyEntry },
        },
        { new: true }
      )
        .select("_id plan downloadsToday lastDownloadDate")
        .lean();

      if (!sameDayUpdated) {
        return next(
          new AppError(
            "Daily download limit reached. Upgrade to Premium.",
            403
          )
        );
      }
    }
  }

  req.videoDoc = video;
  return next();
};
