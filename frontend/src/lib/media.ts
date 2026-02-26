import { getPublicBackendUrl } from "@/lib/backendUrl";

function isLocalhostHostname(hostname: string): boolean {
  const host = (hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function buildMediaUrl(path?: string): string {
  if (!path) return "";

  const raw = String(path).trim();
  if (!raw) return "";

  // 1) If it's already an absolute URL, keep it.
  //    Production safety: if the backend accidentally persisted a localhost URL,
  //    rewrite it onto the configured backend base URL (if present).
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const isLocalhost = isLocalhostHostname(u.hostname);

      if (process.env.NODE_ENV === "production" && isLocalhost) {
        const base = getPublicBackendUrl();
        if (base) {
          try {
            const parsedBase = new URL(base);
            if (isLocalhostHostname(parsedBase.hostname)) {
              // eslint-disable-next-line no-console
              console.error(
                "NEXT_PUBLIC_BACKEND_URL points to localhost in production. Update it to your HTTPS Render URL."
              );
              return `${u.pathname}${u.search}${u.hash}`;
            }
          } catch {
            // ignore
          }

          const rebuilt = new URL(base);
          rebuilt.pathname = `/${u.pathname.replace(/^\/+/, "")}`;
          rebuilt.search = u.search;
          rebuilt.hash = u.hash;
          return rebuilt.toString();
        }

        // No configured backend base → return a relative URL to avoid mixed-content.
        return `${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      // ignore URL parsing errors
    }
    return raw;
  }

  // 2) Relative path → prepend backend base URL
  const normalizedPath = raw.replace(/\\/g, "/");
  const base = getPublicBackendUrl();
  if (!base) return normalizedPath;

  // Production safety: don't ever build localhost URLs in production.
  if (process.env.NODE_ENV === "production") {
    try {
      const parsedBase = new URL(base);
      if (isLocalhostHostname(parsedBase.hostname)) {
        // eslint-disable-next-line no-console
        console.error(
          "NEXT_PUBLIC_BACKEND_URL points to localhost in production. Update it to your HTTPS Render URL."
        );
        return normalizedPath;
      }
    } catch {
      // ignore
    }
  }

  return `${base.replace(/\/+$/, "")}/${normalizedPath.replace(/^\/+/, "")}`;
}
