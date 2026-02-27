import mongoose from "mongoose";
import Subscription from "../models/subscription.js";
import Video from "../models/video.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { withMediaUrls } from "../utils/mediaUrl.js";

const VIDEO_LIST_SELECT =
  "videotitle filepath thumbnailUrl videochanel views createdAt duration category contentType isShort uploader Like Dislike commentsCount trendingScore";

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\[\]\\]/g, "\\$&");
}

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

export const getSubscriptionsFeed = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError("Invalid userId", 400);

  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const limit = Math.min(limitUncapped, 50);

  const sortKey = String(req.query.sort ?? "latest").toLowerCase();
  const sort =
    sortKey === "trending"
      ? { views: -1, createdAt: -1 }
      : sortKey === "mostliked"
        ? { Like: -1, createdAt: -1 }
        : { createdAt: -1 };

  const contentType = String(req.query.contentType ?? "").trim().toLowerCase();
  const category = String(req.query.category ?? "").trim();
  const q = String(req.query.q ?? "").trim();

  const subs = await Subscription.find({ subscriber: userId }).select("channel").lean();
  const channelIds = subs.map((s) => String(s.channel)).filter(Boolean);
  if (channelIds.length === 0) {
    return sendSuccess(
      res,
      {
        items: [],
        totalPages: 0,
        currentPage: page,
      },
      200
    );
  }

  const query = { uploader: { $in: channelIds } };

  if (contentType === "short" || contentType === "video") {
    query.contentType = contentType;
  }

  if (category && category.toLowerCase() !== "all") {
    query.category = category;
  }

  if (q) {
    const safe = escapeRegex(q);
    const rx = new RegExp(safe, "i");
    query.$or = [{ videotitle: rx }, { videochanel: rx }];
  }

  const total = await Video.countDocuments(query);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : page;
  const skip = (currentPage - 1) * limit;

  const items = await Video.find(query)
    .select(VIDEO_LIST_SELECT)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return sendSuccess(
    res,
    {
      items: Array.isArray(items) ? items.map((v) => withMediaUrls(v, req)) : [],
      totalPages,
      currentPage,
    },
    200
  );
};
