import express from "express";
import {
  getSubscriberCount,
  getSubscriptionStatus,
  toggleSubscribe,
} from "../controllers/subscription.js";

const routes = express.Router();

routes.get("/count/:channelId", getSubscriberCount);
routes.get("/status/:channelId/:userId", getSubscriptionStatus);
routes.post("/:channelId", toggleSubscribe);

export default routes;
