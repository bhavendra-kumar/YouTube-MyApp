import express from "express";

import authMiddleware from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getMyPlaylists,
  getPlaylistById,
  getPlaylistsByChannel,
  removeVideoFromPlaylist,
} from "../controllers/playlist.js";

const routes = express.Router();

routes.get("/channel/:channelId", optionalAuth, asyncHandler(getPlaylistsByChannel));
routes.get("/mine", authMiddleware, asyncHandler(getMyPlaylists));
routes.get("/:id", optionalAuth, asyncHandler(getPlaylistById));

routes.post("/", authMiddleware, asyncHandler(createPlaylist));
routes.post("/:id/videos", authMiddleware, asyncHandler(addVideoToPlaylist));
routes.delete("/:id/videos/:videoId", authMiddleware, asyncHandler(removeVideoFromPlaylist));
routes.delete("/:id", authMiddleware, asyncHandler(deletePlaylist));

export default routes;
