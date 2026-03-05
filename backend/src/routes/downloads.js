import express from "express";

import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getUserDownloads } from "../controllers/downloads.js";

const routes = express.Router();

// GET /downloads/my
routes.get("/my", authMiddleware, asyncHandler(getUserDownloads));

export default routes;
