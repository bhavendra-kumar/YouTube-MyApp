import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getallLikedVideo, getReactionStatus, handlelike } from "../controllers/like.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.get("/status/:videoId/:userId", authMiddleware, asyncHandler(getReactionStatus));
routes.get("/:userId", authMiddleware, asyncHandler(getallLikedVideo));
routes.post("/:videoId", authMiddleware, asyncHandler(handlelike));

export default routes;
