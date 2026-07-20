// @ts-nocheck
import mongoose from "mongoose";

import Playlist from "@/models/playlist";
import Video from "@/models/video";
import { AppError } from "@/lib/backend-utils/AppError";
import { sendSuccess } from "@/lib/backend-utils/apiResponse";
import { withMediaUrls } from "@/lib/backend-utils/mediaUrl";

const PLAYLIST_LIST_SELECT = "owner title description visibility videos createdAt";
const PLAYLIST_DETAIL_SELECT = "owner title description visibility videos createdAt updatedAt";
const VIDEO_LIST_SELECT =
  "videotitle filepath thumbnailUrl videochanel views createdAt duration category contentType isShort uploader Like Dislike commentsCount trendingScore";

function requireOwnerOrAdmin(req, ownerId) {
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;
  if (!requesterId) throw new AppError("Unauthorized", 401);
  if (String(requesterId) !== String(ownerId) && requesterRole !== "admin") {
    throw new AppError("Forbidden", 403);
  }
}

export const createPlaylist = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const ownerId = req.user?.id;
  if (!ownerId) throw new AppError("Unauthorized", 401);

  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const visibility = String(req.body?.visibility || "public").toLowerCase();

  if (!title) throw new AppError("title is required", 400);
  if (title.length > 100) throw new AppError("title is too long", 400);
  if (description.length > 1000) throw new AppError("description is too long", 400);

  const safeVisibility = ["public", "unlisted", "private"].includes(visibility)
    ? visibility
    : "public";

  const created = await Playlist.create({
    owner: ownerId,
    title,
    description,
    visibility: safeVisibility,
  });

  return { data: created, status: 201, cookies: resContext.cookies };
};

export const getMyPlaylists = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const ownerId = req.user?.id;
  if (!ownerId) throw new AppError("Unauthorized", 401);

  const items = await Playlist.find({ owner: ownerId })
    .select(PLAYLIST_LIST_SELECT)
    .sort({ createdAt: -1 })
    .lean();
  return { data: { items }, status: 200, cookies: resContext.cookies };
};

export const getPlaylistsByChannel = async (reqArgs: any = {}) => {
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

  const isOwner = Boolean(req.user?.id && String(req.user.id) === String(channelId));
  const filter = isOwner
    ? { owner: channelId }
    : { owner: channelId, visibility: { $ne: "private" } };

  const items = await Playlist.find(filter)
    .select(PLAYLIST_LIST_SELECT)
    .sort({ createdAt: -1 })
    .lean();
  return { data: { items }, status: 200, cookies: resContext.cookies };
};

export const getPlaylistById = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid playlist id", 400);

  const playlist = await Playlist.findById(id)
    .populate({
      path: "videos",
      select: VIDEO_LIST_SELECT,
      options: { lean: true },
    })
    .select(PLAYLIST_DETAIL_SELECT)
    .lean();

  if (!playlist) throw new AppError("Playlist not found", 404);

  // Private playlists are only visible to owner/admin.
  if (playlist.visibility === "private") {
    requireOwnerOrAdmin(req, playlist.owner);
  }

  if (Array.isArray(playlist.videos)) {
    playlist.videos = playlist.videos.map((v) => withMediaUrls(v, req));
  }
  return { data: playlist, status: 200, cookies: resContext.cookies };
};

export const addVideoToPlaylist = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { id } = req.params;
  const videoId = String(req.body?.videoId || "").trim();

  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid playlist id", 400);
  if (!mongoose.Types.ObjectId.isValid(videoId)) throw new AppError("Invalid videoId", 400);

  const playlist = await Playlist.findById(id).select("owner visibility").lean();
  if (!playlist) throw new AppError("Playlist not found", 404);

  requireOwnerOrAdmin(req, playlist.owner);

  const exists = await Video.findById(videoId).select("_id").lean();
  if (!exists) throw new AppError("Video not found", 404);

  await Playlist.findByIdAndUpdate(id, { $addToSet: { videos: videoId } }, { new: true });

  const updated = await Playlist.findById(id)
    .populate({
      path: "videos",
      select: VIDEO_LIST_SELECT,
      options: { lean: true },
    })
    .select(PLAYLIST_DETAIL_SELECT)
    .lean();

  if (updated && Array.isArray(updated.videos)) {
    updated.videos = updated.videos.map((v) => withMediaUrls(v, req));
  }
  return { data: updated, status: 200, cookies: resContext.cookies };
};

export const removeVideoFromPlaylist = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { id, videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid playlist id", 400);
  if (!mongoose.Types.ObjectId.isValid(videoId)) throw new AppError("Invalid videoId", 400);

  const playlist = await Playlist.findById(id).select("owner visibility").lean();
  if (!playlist) throw new AppError("Playlist not found", 404);

  requireOwnerOrAdmin(req, playlist.owner);

  await Playlist.findByIdAndUpdate(id, { $pull: { videos: videoId } }, { new: true });

  const updated = await Playlist.findById(id)
    .populate({
      path: "videos",
      select: VIDEO_LIST_SELECT,
      options: { lean: true },
    })
    .select(PLAYLIST_DETAIL_SELECT)
    .lean();

  if (updated && Array.isArray(updated.videos)) {
    updated.videos = updated.videos.map((v) => withMediaUrls(v, req));
  }
  return { data: updated, status: 200, cookies: resContext.cookies };
};

export const deletePlaylist = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid playlist id", 400);

  const playlist = await Playlist.findById(id).select("owner").lean();
  if (!playlist) throw new AppError("Playlist not found", 404);

  requireOwnerOrAdmin(req, playlist.owner);

  await Playlist.findByIdAndDelete(id);
  return { data: { deleted: true }, status: 200, cookies: resContext.cookies };
};
