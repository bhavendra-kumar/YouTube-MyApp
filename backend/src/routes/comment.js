import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deletecomment, editcomment, getallcomment, postcomment } from "../controllers/comment.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.get("/:videoid", asyncHandler(getallcomment));
routes.post("/postcomment", authMiddleware, asyncHandler(postcomment));
routes.delete("/deletecomment/:id", authMiddleware, asyncHandler(deletecomment));
routes.post("/editcomment/:id", authMiddleware, asyncHandler(editcomment));

export default routes;
