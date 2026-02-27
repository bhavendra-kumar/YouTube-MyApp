import { Readable } from "stream";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import cloudinary from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

function ensureCloudinaryConfigured() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET (or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET).",
      500
    );
  }
}

function sanitizeBaseName(originalName) {
  const original = String(originalName ?? "upload");
  const baseName = original.replace(/\.[^/.]+$/, "");
  return baseName.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80) || "upload";
}

async function saveLocalBuffer({ buffer, originalName }) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new AppError("Empty upload payload", 400);
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(String(originalName || "")).slice(0, 12) || "";
  const safeExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext : "";

  const base = sanitizeBaseName(originalName);
  const nonce = crypto.randomBytes(6).toString("hex");
  const filename = `${Date.now()}-${nonce}-${base}${safeExt}`;

  const fullPath = path.join(uploadsDir, filename);
  await fs.writeFile(fullPath, buffer);

  // Keep the same shape as Cloudinary result, but with a relative path.
  return { secure_url: `/uploads/${filename}`, public_id: "" };
}

function uploadBuffer({ buffer, originalName, resourceType }) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new AppError("Empty upload payload", 400);
  }

  // Prefer Cloudinary when configured, but allow a local fallback in non-prod.
  const canUseCloudinary = Boolean(
    env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
  );
  if (!canUseCloudinary) {
    if (env.nodeEnv === "production") {
      ensureCloudinaryConfigured();
    }
    return saveLocalBuffer({ buffer, originalName });
  }

  const folder = env.cloudinary.folder || "youtube-clone";
  const publicId = `${Date.now()}-${sanitizeBaseName(originalName)}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          // In dev, fall back to local disk instead of failing uploads entirely.
          if (env.nodeEnv !== "production") {
            return saveLocalBuffer({ buffer, originalName }).then(resolve, reject);
          }
          return reject(new AppError(error?.message || "Cloudinary upload failed", 502));
        }
        if (!result?.secure_url) {
          if (env.nodeEnv !== "production") {
            return saveLocalBuffer({ buffer, originalName }).then(resolve, reject);
          }
          return reject(new AppError("Cloudinary upload did not return a secure_url", 502));
        }
        return resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

export async function uploadVideoFile(file) {
  if (!file) throw new AppError("Video file is required", 400);
  return uploadBuffer({
    buffer: file.buffer,
    originalName: file.originalname,
    resourceType: "video",
  });
}

export async function uploadThumbnailFile(file) {
  if (!file) throw new AppError("Thumbnail file is required", 400);
  return uploadBuffer({
    buffer: file.buffer,
    originalName: file.originalname,
    resourceType: "image",
  });
}

export async function uploadRawFile(file) {
  if (!file) throw new AppError("File is required", 400);
  return uploadBuffer({
    buffer: file.buffer,
    originalName: file.originalname,
    resourceType: "raw",
  });
}

export async function uploadCaptionFile(file) {
  return uploadRawFile(file);
}
