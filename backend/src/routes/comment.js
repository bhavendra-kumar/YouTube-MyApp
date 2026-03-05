import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
	deletecomment,
	dislikeComment,
	editcomment,
	getallcomment,
	likeComment,
	postcomment,
	translateComment,
} from "../controllers/comment.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.get("/:videoid", asyncHandler(getallcomment));
routes.post("/postcomment", authMiddleware, asyncHandler(postcomment));
routes.delete("/deletecomment/:id", authMiddleware, asyncHandler(deletecomment));
routes.post("/editcomment/:id", authMiddleware, asyncHandler(editcomment));

routes.post("/:id/like", authMiddleware, asyncHandler(likeComment));
routes.post("/:id/dislike", authMiddleware, asyncHandler(dislikeComment));
routes.post("/translate", asyncHandler(translateComment));

export default routes;
