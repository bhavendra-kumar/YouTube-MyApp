import { env } from "./env.js";

function splitCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const normalizeOrigin = (value) => {
  if (!value) return "";
  let raw = String(value).trim();
  if (!raw) return "";

  // Some dashboards store env values with surrounding quotes.
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    // If someone configures FRONTEND_URL as a bare hostname (common in dashboards),
    // treat it as an https origin.
    if (!raw.includes("://") && !raw.startsWith("//")) {
      try {
        const url = new URL(`https://${raw.replace(/^\/+/, "")}`);
        return `${url.protocol}//${url.host}`;
      } catch {
        // fall through
      }
    }

    return raw.replace(/\/+$/, "");
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

function getVercelProjectSlugFromFrontendUrl() {
  const normalized = normalizeOrigin(env.frontendUrl);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    const host = String(url.hostname || "").toLowerCase();
    if (!host.endsWith(".vercel.app")) return "";
    return host.slice(0, -".vercel.app".length);
  } catch {
    return "";
  }
}

function allowVercelPreview(origin) {
  const slug = getVercelProjectSlugFromFrontendUrl();
  if (!slug) return false;

  try {
    const url = new URL(String(origin));
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    const host = String(url.hostname || "").toLowerCase();
    if (!host.endsWith(".vercel.app")) return false;

    // Allow:
    // - <slug>.vercel.app (production)
    // - <slug>-*.vercel.app (preview deployments)
    return host === `${slug}.vercel.app` || host.startsWith(`${slug}-`);
  } catch {
    return false;
  }
}

const configuredOrigins = new Set(
  [env.frontendUrl, ...splitCsv(env.frontendUrls)].map(normalizeOrigin).filter(Boolean)
);

export function corsOriginChecker(origin, cb) {
  // Allow non-browser tools (no origin)
  if (!origin) return cb(null, true);
  const normalized = normalizeOrigin(origin);
  if (configuredOrigins.has(normalized)) return cb(null, true);
  if (allowVercelPreview(origin)) return cb(null, true);
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
