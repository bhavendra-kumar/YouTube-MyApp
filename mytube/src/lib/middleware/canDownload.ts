import mongoose from "mongoose";
import User from "@/models/user";
import Video from "@/models/video";
import { AppError } from "../backend-utils/AppError";
import { NextRequest } from "next/server";

function startOfTodayUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const checkCanDownloadVideo = async (userId: string, videoId: string) => {
  if (!userId) throw new AppError("Unauthorized", 401);

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new AppError("Invalid video id", 400);
  }

  const video = await Video.findById(videoId)
    .select("_id videotitle filepath filetype filename")
    .lean();

  if (!video) throw new AppError("Video not found", 404);

  const now = new Date();
  const todayStart = startOfTodayUtc(now);

  const historyEntry = {
    videoId: new mongoose.Types.ObjectId(videoId),
    downloadedAt: now,
  };

  const premiumUpdated = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { isPremium: true },
        { plan: { $in: ["PREMIUM", "BRONZE", "SILVER", "GOLD"] } },
      ],
    },
    {
      $set: { lastDownloadDate: now },
      $push: { downloadHistory: historyEntry },
    },
    { new: true }
  )
    .select("_id plan")
    .lean();

  if (!premiumUpdated) {
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
          isPremium: false,
          plan: "FREE",
          downloadsToday: 1,
          dailyDownloadCount: 1,
          lastDownloadDate: now,
        },
        $push: { downloadHistory: historyEntry },
      },
      { new: true }
    )
      .select("_id plan downloadsToday lastDownloadDate")
      .lean();

    if (!newDayUpdated) {
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
          $set: { isPremium: false, plan: "FREE", lastDownloadDate: now },
          $inc: { downloadsToday: 1, dailyDownloadCount: 1 },
          $push: { downloadHistory: historyEntry },
        },
        { new: true }
      )
        .select("_id plan downloadsToday lastDownloadDate")
        .lean();

      if (!sameDayUpdated) {
        throw new AppError("You crossed the download limit. Go Premium.", 403);
      }
    }
  }

  return video;
};
