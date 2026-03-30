import fs from "fs";
import path from "path";
import { once } from "events";
import { pipeline } from "stream/promises";
import fetch from "node-fetch";

import Download from "../models/download.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

function sanitizeFilename(name) {
  const base = String(name || "download")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return base.slice(0, 120) || "download";
}

function guessExtension(mime, fallbackExt = "mp4") {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mp4")) return "mp4";
  if (m.includes("webm")) return "webm";
  if (m.includes("quicktime") || m.includes("mov")) return "mov";
  if (m.includes("x-matroska") || m.includes("mkv")) return "mkv";
  return fallbackExt;
}

function resolveLocalPath(filepath) {
  const fp = String(filepath || "");
  if (!fp) return null;

  // Stored as "/uploads/foo.mp4" (served by server.js) or "uploads/foo.mp4"
  const normalized = fp.startsWith("/") ? fp.slice(1) : fp;
  const full = path.join(process.cwd(), normalized);
  return full;
}

function ensureDirSync(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // If the directory already exists or cannot be created, let callers handle failures.
  }
}

function getDownloadPaths({ videoId, ext }) {
  const dir = path.join(process.cwd(), "uploads", "downloads");
  const base = `${String(videoId)}.${String(ext || "mp4")}`;
  const finalFullPath = path.join(dir, base);
  const tempFullPath = `${finalFullPath}.part`;
  const publicPath = `/uploads/downloads/${base}`;
  return { dir, finalFullPath, tempFullPath, publicPath };
}

export const downloadVideo = async (req, res) => {
  const video = req.videoDoc;
  if (!video) throw new AppError("Video not loaded", 500);

  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const rawTitle = String(video?.videotitle || video?.filename || "video");
  const ext = guessExtension(video?.filetype, "mp4");
  // Keep a readable name around for logs/debugging, but the stored file name is deterministic: {videoId}.{ext}
  // eslint-disable-next-line no-unused-vars
  const _debugName = sanitizeFilename(rawTitle);

  const filepath = String(video?.filepath || "");
  const isRemote = /^https?:\/\//i.test(filepath);

  if (!filepath) throw new AppError("Video file unavailable", 404);

  const videoId = String(video?._id || req.params?.videoId || "");
  if (!videoId) throw new AppError("Invalid video", 400);

  const { dir, finalFullPath, tempFullPath, publicPath } = getDownloadPaths({ videoId, ext });
  ensureDirSync(dir);

  // If the file already exists, just ensure we have a DB record.
  if (fs.existsSync(finalFullPath)) {
    await Download.findOneAndUpdate(
      { userId, videoId: video._id },
      { $set: { filePath: publicPath, downloadedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(
      res,
      { message: "Video downloaded successfully", path: publicPath, downloadUrl: publicPath },
      200
    );
  }

  if (!isRemote) {
    const sourceFull = resolveLocalPath(filepath);
    if (!sourceFull) throw new AppError("Video file unavailable", 404);
    if (!fs.existsSync(sourceFull)) throw new AppError("Video file unavailable", 404);

    try {
      await fs.promises.copyFile(sourceFull, finalFullPath);
    } catch (e) {
      throw new AppError("Failed to save download", 500);
    }
  } else {
    const upstream = await fetch(filepath);
    if (!upstream.ok || !upstream.body) {
      throw new AppError("Download source unavailable", 502);
    }

    let writeStream = null;
    try {
      writeStream = fs.createWriteStream(tempFullPath, { flags: "wx" });
    } catch {
      // Another request may already be writing; wait for it by polling existence.
      // (simple backoff; avoids complex locks)
      const start = Date.now();
      while (!fs.existsSync(finalFullPath) && Date.now() - start < 15000) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!fs.existsSync(finalFullPath)) {
        throw new AppError("Download is in progress, please retry", 409);
      }
    }

    if (writeStream) {
      try {
        const closePromise = once(writeStream, "close");
        await pipeline(upstream.body, writeStream);
        // On Windows, rename is safest after the stream closes.
        await closePromise;
        fs.renameSync(tempFullPath, finalFullPath);
      } catch (e) {
        try {
          if (fs.existsSync(tempFullPath)) fs.unlinkSync(tempFullPath);
        } catch {
          // ignore
        }
        throw new AppError("Failed to save download", 500);
      }
    }
  }

  await Download.findOneAndUpdate(
    { userId, videoId: video._id },
    { $set: { filePath: publicPath, downloadedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return sendSuccess(
    res,
    { message: "Video downloaded successfully", path: publicPath, downloadUrl: publicPath },
    200
  );
};
