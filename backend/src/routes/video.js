import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteMyVideo, getallvideo, getHomeFeed, getShortsFeed, getvideobyid, postWatchTime, updateMyVideo, uploadVideo } from "../controllers/video.js";
import upload from "../utils/upload.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.post(
	"/upload",
	authMiddleware,
	upload.fields([
		{ name: "file", maxCount: 1 },
		{ name: "video", maxCount: 1 },
		{ name: "thumbnail", maxCount: 1 },
		{ name: "caption", maxCount: 5 },
		{ name: "captions", maxCount: 5 },
	]),
	asyncHandler(uploadVideo)
);
routes.get("/getall", asyncHandler(getallvideo));
routes.get("/home", asyncHandler(getHomeFeed));
routes.get("/homefeed", asyncHandler(getHomeFeed));
routes.get("/shorts", asyncHandler(getShortsFeed));
routes.get("/recommended", authMiddleware, asyncHandler(getHomeFeed));
routes.post("/watchtime", asyncHandler(postWatchTime));
routes.patch("/:id", authMiddleware, asyncHandler(updateMyVideo));
routes.delete("/:id", authMiddleware, asyncHandler(deleteMyVideo));
routes.get("/:id", asyncHandler(getvideobyid));

export default routes;
