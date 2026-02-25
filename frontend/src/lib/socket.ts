import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getBackendUrl() {
  const defaultUrl =
    process.env.NODE_ENV === "production"
      ? "https://youtube-myapp.onrender.com"
      : "http://localhost:5000";

  return (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim() || defaultUrl;
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(getBackendUrl(), {
    autoConnect: false,
    transports: ["websocket"],
  });

  return socket;
}
