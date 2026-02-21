import express from "express";
import {
  getallwatchlater,
  handlewatchlater,
  getWatchLaterStatus,
} from "../controllers/watchlater.js";

const routes = express.Router();
routes.get("/status/:videoId/:userId", getWatchLaterStatus);
routes.get("/:userId", getallwatchlater);
routes.post("/:videoId", handlewatchlater);
export default routes;