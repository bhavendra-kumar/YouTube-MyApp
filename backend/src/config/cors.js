import { env } from "./env.js";

const DEFAULT_FRONTEND_ORIGIN = "https://youtube-myapp.vercel.app/" || "http://localhost:3000";

const normalizeOrigin = (value) => {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    return `${url.protocol}//${url.host}`;
  } catch {
    return String(value).replace(/\/+$/, "");
  }
};

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

const frontendOrigin = normalizeOrigin(env.frontendUrl) || DEFAULT_FRONTEND_ORIGIN;

export function corsOriginChecker(origin, cb) {
  // Allow non-browser tools (no origin)
  if (!origin) return cb(null, true);
  if (normalizeOrigin(origin) === frontendOrigin) return cb(null, true);
  if (allowLocalhost(origin)) return cb(null, true);
  return cb(new Error("Not allowed by CORS"));
}

export const corsOptions = {
  origin: corsOriginChecker,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
};

export const socketCorsOptions = {
  origin: corsOriginChecker,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  credentials: true,
};
