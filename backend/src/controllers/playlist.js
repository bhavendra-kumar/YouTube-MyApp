import mongoose from "mongoose";

import Playlist from "../models/playlist.js";
import Video from "../models/video.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { withMediaUrls } from "../utils/mediaUrl.js";

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

export const createPlaylist = async (req, res) => {
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

  return sendSuccess(res, created, 201);
};

export const getMyPlaylists = async (req, res) => {
  const ownerId = req.user?.id;
  if (!ownerId) throw new AppError("Unauthorized", 401);

  const items = await Playlist.find({ owner: ownerId })
    .select(PLAYLIST_LIST_SELECT)
    .sort({ createdAt: -1 })
    .lean();
  return sendSuccess(res, { items }, 200);
};

export const getPlaylistsByChannel = async (req, res) => {
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
  return sendSuccess(res, { items }, 200);
};

export const getPlaylistById = async (req, res) => {
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
  return sendSuccess(res, playlist, 200);
};

export const addVideoToPlaylist = async (req, res) => {
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
  return sendSuccess(res, updated, 200);
};

export const removeVideoFromPlaylist = async (req, res) => {
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
  return sendSuccess(res, updated, 200);
};

export const deletePlaylist = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid playlist id", 400);

  const playlist = await Playlist.findById(id).select("owner").lean();
  if (!playlist) throw new AppError("Playlist not found", 404);

  requireOwnerOrAdmin(req, playlist.owner);

  await Playlist.findByIdAndDelete(id);
  return sendSuccess(res, { deleted: true }, 200);
};
