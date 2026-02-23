import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSubscriberCount, getSubscriptionStatus, toggleSubscribe } from "../controllers/subscription.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.get("/count/:channelId", asyncHandler(getSubscriberCount));
routes.get("/status/:channelId/:userId", authMiddleware, asyncHandler(getSubscriptionStatus));
routes.post("/:channelId", authMiddleware, asyncHandler(toggleSubscribe));

export default routes;
