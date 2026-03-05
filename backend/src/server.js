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
import paymentroutes from "./routes/payment.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import subscriptionroutes from "./routes/subscription.js";
import playlistroutes from "./routes/playlist.js";
import communityroutes from "./routes/community.js";
import downloadroutes from "./routes/downloads.js";

import Like from "./models/like.js";
import Dislike from "./models/dislike.js";

const app = express();

// Needed behind proxies (Render, etc.) so req.protocol reflects X-Forwarded-Proto (https)
app.set("trust proxy", 1);

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

// Prevent unhandled 'error' events from crashing the process.
// (We still handle startup listen errors more explicitly below.)
server.on("error", (err) => {
  if (err?.code === "EADDRINUSE" && !server.listening) return;
  // eslint-disable-next-line no-console
  console.error("HTTP server error", err);
});

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/downloads", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/subscribe", subscriptionroutes);
app.use("/playlist", playlistroutes);
app.use("/community", communityroutes);

app.use(notFound);
app.use(errorHandler);

function buildPortInUseMessage(port) {
  return [
    `Port ${port} is already in use.`,
    "You can:",
    `- Stop the other process using port ${port}`,
    "- Or change PORT in your .env file",
  ].join("\n");
}

async function listenWithFallback(startPort) {
  const allowFallback =
    process.env.ALLOW_PORT_FALLBACK === "true" &&
    env.nodeEnv !== "production" &&
    process.env.PORT_STRICT !== "true";
  const retryCount = Number.parseInt(process.env.PORT_RETRY_COUNT || "10", 10);
  const maxAttempts = allowFallback ? Math.max(1, retryCount + 1) : 1;

  let port = startPort;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (err) => {
          cleanup();
          reject(err);
        };
        const onListening = () => {
          cleanup();
          resolve();
        };
        const cleanup = () => {
          server.off("error", onError);
          server.off("listening", onListening);
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port);
      });

      return port;
    } catch (err) {
      const isAddrInUse = err?.code === "EADDRINUSE";
      const isLastAttempt = attempt === maxAttempts;

      if (!isAddrInUse || !allowFallback || isLastAttempt) {
        if (isAddrInUse) {
          throw new Error(buildPortInUseMessage(port));































          
        }

        throw err;
      }

      // eslint-disable-next-line no-console
      console.warn(`Port ${port} is in use; trying ${port + 1}...`);
      port += 1;
    }
  }

  return startPort;
}

async function start() {
  await connectDb();

  try {
    await Promise.all([Like.init(), Dislike.init()]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Index initialization warning", err?.message || err);
  }

  const actualPort = await listenWithFallback(env.port);
  app.set("port", actualPort);

  // eslint-disable-next-line no-console
  console.log(`server running on port ${actualPort}`);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err?.message || err);
  if (process.env.STARTUP_DEBUG === "true" && err?.stack) {
    // eslint-disable-next-line no-console
    console.error(err.stack);
  }
  process.exit(1);
});
