// @ts-nocheck
import mongoose from "mongoose";

import CommunityPost from "@/models/communityPost";
import { AppError } from "@/lib/backend-utils/AppError";
import { sendSuccess } from "@/lib/backend-utils/apiResponse";

function requireChannelOwnerOrAdmin(req, channelId) {
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;
  if (!requesterId) throw new AppError("Unauthorized", 401);
  if (String(requesterId) !== String(channelId) && requesterRole !== "admin") {
    throw new AppError("Forbidden", 403);
  }
}

export const listChannelPosts = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { channelId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new AppError("Invalid channelId", 400);
  }

  const items = await CommunityPost.find({ channel: channelId })
    .select("text createdAt channel author")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return { data: { items }, status: 200, cookies: resContext.cookies };
};

export const createChannelPost = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
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

  return { data: created, status: 201, cookies: resContext.cookies };
};

export const deletePost = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid post id", 400);

  const existing = await CommunityPost.findById(id).select("channel").lean();
  if (!existing) throw new AppError("Post not found", 404);

  requireChannelOwnerOrAdmin(req, existing.channel);

  await CommunityPost.findByIdAndDelete(id);
  return { data: { deleted: true }, status: 200, cookies: resContext.cookies };
};
