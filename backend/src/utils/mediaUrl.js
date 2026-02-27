import { env } from "../config/env.js";

function normalizeBaseUrl(raw) {
  if (!raw) return "";
  let value = String(raw).trim();
  if (!value) return "";

  // Allow passing just a hostname (e.g. youtube-myapp.onrender.com)
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value.replace(/^\/\/+/, "")}`;
  }

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export function getBackendBaseUrl(req) {
  const configured = normalizeBaseUrl(env.backendUrl);
  if (configured) return configured;

  const proto = req?.protocol;
  const host = req?.get?.("host");
  if (!proto || !host) return "";

  // Never generate localhost URLs in responses.
  try {
    const url = new URL(`${proto}://${host}`);
    if (isLocalhostHostname(url.hostname)) return "";
  } catch {
    return "";
  }

  return normalizeBaseUrl(`${proto}://${host}`);
}

function isLocalhostHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function buildMediaUrl(value, req) {
  if (!value) return value;

  const baseUrl = getBackendBaseUrl(req);
  const raw = String(value);
  if (!baseUrl) return raw;

  // Absolute URL: keep unless it's an old localhost uploads URL.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (isLocalhostHostname(url.hostname) && url.pathname.startsWith("/uploads/")) {
        return `${baseUrl}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // ignore parse errors, return as-is
    }
    return raw;
  }

  // Relative uploads URL: make absolute.
  if (raw.startsWith("/uploads/")) {
    return `${baseUrl}${raw}`;
  }
  if (raw.startsWith("uploads/")) {
    return `${baseUrl}/${raw}`;
  }

  return raw;
}

export function withMediaUrls(video, req) {
  if (!video || typeof video !== "object") return video;

  const next = { ...video };

  if ("filepath" in next) {
    next.filepath = buildMediaUrl(next.filepath, req);
  }

  if ("thumbnailUrl" in next) {
    next.thumbnailUrl = buildMediaUrl(next.thumbnailUrl, req);
  }

  if (Array.isArray(next.sources)) {
    next.sources = next.sources.map((s) => ({
      ...s,
      src: buildMediaUrl(s?.src, req),
    }));
  }

  if (Array.isArray(next.captions)) {
    next.captions = next.captions.map((c) => ({
      ...c,
      src: buildMediaUrl(c?.src, req),
    }));
  }

  return next;
}
