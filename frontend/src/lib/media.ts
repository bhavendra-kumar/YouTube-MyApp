export function buildMediaUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = String(path).replace(/\\/g, "/");

  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  if (!base) return normalizedPath;

  return `${base.replace(/\/+$/, "")}/${normalizedPath.replace(/^\/+/, "")}`;
}
