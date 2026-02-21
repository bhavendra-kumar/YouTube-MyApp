import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getBackendUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(getBackendUrl(), {
    autoConnect: false,
    transports: ["websocket"],
  });

  return socket;
}
