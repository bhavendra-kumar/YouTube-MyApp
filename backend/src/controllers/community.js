import mongoose from "mongoose";

import CommunityPost from "../models/communityPost.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

function requireChannelOwnerOrAdmin(req, channelId) {
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;
  if (!requesterId) throw new AppError("Unauthorized", 401);
  if (String(requesterId) !== String(channelId) && requesterRole !== "admin") {
    throw new AppError("Forbidden", 403);
  }
}

export const listChannelPosts = async (req, res) => {
  const { channelId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new AppError("Invalid channelId", 400);
  }

  const items = await CommunityPost.find({ channel: channelId })
    .select("text createdAt channel author")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return sendSuccess(res, { items }, 200);
};

export const createChannelPost = async (req, res) => {
  const { channelId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new AppError("Invalid channelId", 400);
  }

  requireChannelOwnerOrAdmin(req, channelId);

  const text = String(req.body?.text || "").trim();
  if (!text) throw new AppError("text is required", 400);
  if (text.length > 1000) throw new AppError("text is too long", 400);

  const created = await CommunityPost.create({
    channel: channelId,
    author: req.user.id,
    text,
  });

  return sendSuccess(res, created, 201);
};

export const deletePost = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid post id", 400);

  const existing = await CommunityPost.findById(id).select("channel").lean();
  if (!existing) throw new AppError("Post not found", 404);

  requireChannelOwnerOrAdmin(req, existing.channel);

  await CommunityPost.findByIdAndDelete(id);
  return sendSuccess(res, { deleted: true }, 200);
};
