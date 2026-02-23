import { Readable } from "stream";

import cloudinary from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

function ensureCloudinaryConfigured() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET.",
      500
    );
  }
}

function sanitizeBaseName(originalName) {
  const original = String(originalName ?? "upload");
  const baseName = original.replace(/\.[^/.]+$/, "");
  return baseName.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80) || "upload";
}

function uploadBuffer({ buffer, originalName, resourceType }) {
  ensureCloudinaryConfigured();

  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new AppError("Empty upload payload", 400);
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
          return reject(new AppError(error?.message || "Cloudinary upload failed", 502));
        }
        if (!result?.secure_url) {
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
