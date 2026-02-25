import express from "express";

import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createChannelPost, deletePost, listChannelPosts } from "../controllers/community.js";

const routes = express.Router();

routes.get("/channel/:channelId", asyncHandler(listChannelPosts));
routes.post("/channel/:channelId", authMiddleware, asyncHandler(createChannelPost));
routes.delete("/:id", authMiddleware, asyncHandler(deletePost));

export default routes;
