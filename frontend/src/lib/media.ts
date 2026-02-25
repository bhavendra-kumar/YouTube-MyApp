export function buildMediaUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = String(path).replace(/\\/g, "/");

  const defaultBase =
    process.env.NODE_ENV === "production"
      ? "https://youtube-myapp.onrender.com"
      : "http://localhost:5000";

  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim() || defaultBase;

  return `${base.replace(/\/+$/, "")}/${normalizedPath.replace(/^\/+/, "")}`;
}
