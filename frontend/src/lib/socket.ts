import { io, type Socket } from "socket.io-client";

import { getPublicBackendUrl } from "@/lib/backendUrl";

let socket: Socket | null = null;

function isLocalhostHostname(hostname: string): boolean {
  const host = (hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function getSocket(): Socket {
  if (socket) return socket;

  const backendUrl = getPublicBackendUrl();

  // Production-safe behavior: Socket.IO must point at the deployed backend.
  // If this is missing in production, don't silently connect to the Vercel origin.
  if (!backendUrl && process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing NEXT_PUBLIC_BACKEND_URL in production. Set it in Vercel for both Production and Preview to your HTTPS Render backend URL."
    );
  }

  if (backendUrl && process.env.NODE_ENV === "production") {
    try {
      const parsed = new URL(backendUrl);
      if (isLocalhostHostname(parsed.hostname)) {
        throw new Error(
          "NEXT_PUBLIC_BACKEND_URL points to localhost in production. Update it to your HTTPS Render backend URL."
        );
      }
    } catch (err) {
      // If backendUrl isn't parseable, keep going; the Socket.IO client will surface the error.
      if (err instanceof Error && /localhost/i.test(err.message)) {
        throw err;
      }
    }
  }

  socket = backendUrl
    ? io(backendUrl, {
        autoConnect: false,
        transports: ["websocket"],
        withCredentials: true,
      })
    : io({
        autoConnect: false,
        transports: ["websocket"],
        withCredentials: true,
      });

  return socket;
}
