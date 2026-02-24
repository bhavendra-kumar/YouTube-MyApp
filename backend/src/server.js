import "./config/env.js";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { corsOptions } from "./config/cors.js";
import { apiRateLimiter } from "./config/rateLimit.js";
import { createHttpServer, initSocket } from "./services/socket.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendSuccess } from "./utils/apiResponse.js";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import subscriptionroutes from "./routes/subscription.js";

import Like from "./models/like.js";
import Dislike from "./models/dislike.js";

const app = express();

app.use(cors(corsOptions));
app.use(apiRateLimiter);
app.use(cookieParser());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// Serve locally stored media (dev fallback when Cloudinary isn't available)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  return sendSuccess(res, "You tube backend is working", 200);
});

const server = createHttpServer(app);
const io = initSocket(server);
app.set("io", io);

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/subscribe", subscriptionroutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDb();

  // Build critical indexes (unique constraints, etc.) at startup.
  // This avoids racey duplicate reactions if auto-indexing is delayed.
  try {
    await Promise.all([Like.init(), Dislike.init()]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Index initialization warning", err?.message || err);
  }

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`server running on port ${env.port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", err);
  process.exit(1);
});
