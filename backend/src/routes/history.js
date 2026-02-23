import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
	clearHistory,
	deleteHistoryItem,
	getallhistoryVideo,
	handlehistory,
	handleview,
} from "../controllers/history.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.delete("/clear", authMiddleware, asyncHandler(clearHistory));
routes.get("/:userId", authMiddleware, asyncHandler(getallhistoryVideo));
routes.delete("/item/:historyId", authMiddleware, asyncHandler(deleteHistoryItem));
routes.post("/views/:videoId", asyncHandler(handleview));
routes.post("/:videoId", authMiddleware, asyncHandler(handlehistory));

export default routes;
