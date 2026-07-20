// @ts-nocheck
import http from "http";
import { Server } from "socket.io";
import { corsOptions } from "../config/cors";

export function createHttpServer(app) {
  return http.createServer(app);
}

export function initSocket(server) {
  const io = new Server(server, {
    cors: corsOptions,
  });

  io.on("connection", (socket) => {
    socket.on("user:register", (userId) => {
      const id = String(userId || "").trim();
      if (!id) return;
      socket.data.userId = id;
      socket.join(`user:${id}`);
    });

    socket.on("video:join", (videoId) => {
      if (!videoId) return;
      socket.join(`video:${videoId}`);
    });

    socket.on("video:leave", (videoId) => {
      if (!videoId) return;
      socket.leave(`video:${videoId}`);
    });

    // WebRTC call signaling (server just forwards messages)
    socket.on("call:offer", (payload) => {
      const toUserId = String(payload?.toUserId || "").trim();
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:offer", payload);
    });

    socket.on("call:answer", (payload) => {
      const toUserId = String(payload?.toUserId || "").trim();
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:answer", payload);
    });

    socket.on("call:ice", (payload) => {
      const toUserId = String(payload?.toUserId || "").trim();
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:ice", payload);
    });

    socket.on("call:end", (payload) => {
      const toUserId = String(payload?.toUserId || "").trim();
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit("call:end", payload);
    });
  });

  return io;
}
