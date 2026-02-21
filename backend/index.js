import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import subscriptionroutes from "./routes/subscription.js";
dotenv.config();
const app = express();
import path from "path";
import http from "http";
import { Server } from "socket.io";

const frontendOrigin = process.env.FRONTEND_URL;
const allowLocalhost = (origin) => {
  try {
    const url = new URL(String(origin));
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const host = String(url.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;

    // Allow private LAN IPs for local dev (e.g. Next.js "Network" URL)
    if (/^10\.(\d{1,3}\.){2}\d{1,3}$/.test(host)) return true;
    if (/^192\.168\.(\d{1,3}\.)\d{1,3}$/.test(host)) return true;
    const m = host.match(/^172\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) {
      const second = Number(m[1]);
      if (second >= 16 && second <= 31) return true;
    }

    return false;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (no origin)
      if (!origin) return cb(null, true);

      if (frontendOrigin && origin === frontendOrigin) return cb(null, true);
      if (allowLocalhost(origin)) return cb(null, true);

      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (frontendOrigin && origin === frontendOrigin) return cb(null, true);
      if (allowLocalhost(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("video:join", (videoId) => {
    if (!videoId) return;
    socket.join(`video:${videoId}`);
  });

  socket.on("video:leave", (videoId) => {
    if (!videoId) return;
    socket.leave(`video:${videoId}`);
  });
});
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/subscribe", subscriptionroutes);
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DB_URL = process.env.DB_URL;
mongoose
  .connect(DB_URL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });