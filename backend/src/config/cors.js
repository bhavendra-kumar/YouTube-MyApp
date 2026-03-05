import cors from "cors";

import { env } from "./env.js";

function parseOrigins(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isLocalhostOrigin(origin) {
  try {
    const url = new URL(origin);
    const host = (url.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // In development, allow localhost (Next dev runs on 3000/3001 etc.).
    if (env.nodeEnv !== "production" && isLocalhostOrigin(origin)) {
      return callback(null, true);
    }

    const allowed = new Set([
      ...parseOrigins(env.frontendUrl),
      ...parseOrigins(env.frontendUrls),
      "https://youtube-myapp.vercel.app",
    ]);

    if (
      allowed.has(origin) ||
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
