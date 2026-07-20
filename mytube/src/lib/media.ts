const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export function buildMediaUrl(path?: string) {
  if (!path) return "";

  if (path.startsWith("http")) return path;

  return `${BACKEND}${path.startsWith("/") ? "" : "/"}${path}`;
}
