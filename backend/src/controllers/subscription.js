import mongoose from "mongoose";
import Subscription from "../models/subscription.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const toggleSubscribe = async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?.id || req.body.userId;

  if (req.user?.id && req.body?.userId && String(req.user.id) !== String(req.body.userId)) {
    throw new AppError("userId does not match token", 403);
  }

  if (!userId) throw new AppError("userId is required", 400);
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError("Invalid userId", 400);
  if (!mongoose.Types.ObjectId.isValid(channelId))
    throw new AppError("Invalid channelId", 400);

  if (String(userId) === String(channelId)) {
    throw new AppError("You cannot subscribe to yourself", 400);
  }

  try {
    const existing = await Subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });

    if (existing) {
      await Subscription.findByIdAndDelete(existing._id);
    } else {
      await Subscription.create({ subscriber: userId, channel: channelId });
    }

    const subscribers = await Subscription.countDocuments({ channel: channelId });
    return sendSuccess(res, { subscribed: !existing, subscribers }, 200);
  } catch (error) {
    // Handle race conditions on unique index
    if (error?.code === 11000) {
      const subscribers = await Subscription.countDocuments({ channel: channelId });
      return sendSuccess(res, { subscribed: true, subscribers }, 200);
    }
    throw error;
  }
};

export const getSubscriberCount = async (req, res) => {
  const { channelId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new AppError("Invalid channelId", 400);
  }

  const subscribers = await Subscription.countDocuments({ channel: channelId });
  return sendSuccess(res, { subscribers }, 200);
};

export const getSubscriptionStatus = async (req, res) => {
  const { channelId, userId: userIdParam } = req.params;
  const userId = req.user?.id || userIdParam;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid userId", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new AppError("Invalid channelId", 400);
  }

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const existing = await Subscription.findOne({ subscriber: userId, channel: channelId }).select(
    "_id"
  );
  const subscribers = await Subscription.countDocuments({ channel: channelId });

  return sendSuccess(
    res,
    {
      subscribed: Boolean(existing),
      subscribers,
    },
    200
  );
};
