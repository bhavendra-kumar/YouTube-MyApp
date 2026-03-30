function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function isLocalhostHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}


export function getPublicBackendUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
  const lowered = raw.toLowerCase();
  const isEffectivelyEmpty = !raw || lowered === "undefined" || lowered === "null";

  if (isEffectivelyEmpty) {
    // In local dev, default to the backend dev server.
    if (process.env.NODE_ENV !== "production") {
      return "http://localhost:5002";
    }
    return "";
  }

  const isBrowser = typeof window !== "undefined";

  try {
    const parsed = new URL(raw);

    // Enforce HTTPS in production for non-localhost backends.
    if (
      process.env.NODE_ENV === "production" &&
      parsed.protocol === "http:" &&
      !isLocalhostHost(parsed.hostname)
    ) {
      parsed.protocol = "https:";
    }

    if (isBrowser && process.env.NODE_ENV === "production" && isLocalhostHost(parsed.hostname)) {
      // eslint-disable-next-line no-console
      console.error(
        "NEXT_PUBLIC_BACKEND_URL points to localhost in production. Update it to your HTTPS Render URL."
      );
    }

    return stripTrailingSlashes(parsed.toString());
  } catch {
    // If someone provides a non-URL string, do a best-effort normalization.
    return stripTrailingSlashes(raw);
  }
}
