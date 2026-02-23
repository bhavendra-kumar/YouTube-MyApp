import http from "http";
import { Server } from "socket.io";
import { socketCorsOptions } from "../config/cors.js";

export function createHttpServer(app) {
  return http.createServer(app);
}

export function initSocket(server) {
  const io = new Server(server, {
    cors: socketCorsOptions,
  });

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

  return io;
}
