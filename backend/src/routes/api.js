import express from "express";
import mongoose from "mongoose";

import authMiddleware from "../middleware/auth.js";
import { canDownloadVideo } from "../middleware/canDownload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

import paymentRoutes from "./payment.js";
import { getUserDownloads } from "../controllers/downloads.js";
import { downloadVideo } from "../controllers/videoDownload.js";

const routes = express.Router();

// POST /api/download
// Body: { videoId }
routes.post(
  "/download",
  authMiddleware,
  (req, _res, next) => {
    const videoId = req.body?.videoId;
    if (!videoId || !mongoose.Types.ObjectId.isValid(String(videoId))) {
      return next(new AppError("Invalid video id", 400));
    }
    // Reuse existing middleware/controller chain which expects params.
    req.params.videoId = String(videoId);
    return next();
  },
  asyncHandler(canDownloadVideo),
  asyncHandler(downloadVideo)
);

// GET /api/downloads
routes.get("/downloads", authMiddleware, asyncHandler(getUserDownloads));

// Payment APIs
routes.use("/payment", paymentRoutes);

export default routes;
