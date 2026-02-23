import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getallwatchlater, getWatchLaterStatus, handlewatchlater } from "../controllers/watchlater.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.get("/status/:videoId/:userId", authMiddleware, asyncHandler(getWatchLaterStatus));
routes.get("/:userId", authMiddleware, asyncHandler(getallwatchlater));
routes.post("/:videoId", authMiddleware, asyncHandler(handlewatchlater));

export default routes;
