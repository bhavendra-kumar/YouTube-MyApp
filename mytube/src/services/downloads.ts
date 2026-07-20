import axiosClient from "@/services/http/axios";

export type DownloadResponse = {
  message?: string;
  path?: string;
  downloadUrl?: string;
};

export async function requestVideoDownload(videoId: string): Promise<DownloadResponse> {
  const id = String(videoId || "").trim();
  if (!id) throw new Error("Missing video id");

  const res = await axiosClient.post<DownloadResponse>("/download", { videoId: id });
  return (res.data || {}) as DownloadResponse;
}

function safeFilename(input: string, fallback: string) {
  const base = String(input || "")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return (base || fallback).slice(0, 120);
}


export async function triggerBrowserDownload(url: string, filename?: string) {
  const href = String(url || "").trim();
  if (!href) throw new Error("Missing download URL");

  const name = safeFilename(filename || "", "video");

  try {
    const res = await fetch(href, { method: "GET", credentials: "include" });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();

    const objectUrl = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    return;
  } catch {
    // Fallback: open the direct URL.
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener,noreferrer";
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

