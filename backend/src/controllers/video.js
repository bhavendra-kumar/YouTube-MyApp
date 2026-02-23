import Video from "../models/video.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { uploadThumbnailFile, uploadVideoFile } from "../services/uploadService.js";

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickFirstFile(req, fieldNames) {
  for (const name of fieldNames) {
    const file = req?.files?.[name]?.[0];
    if (file) return file;
  }
  return null;
}

export const uploadVideo = async (req, res) => {
  const videoFile = pickFirstFile(req, ["video", "file"]);
  const thumbnailFile = pickFirstFile(req, ["thumbnail"]);

  if (!videoFile) {
    if (req.fileValidationError) {
      throw new AppError(req.fileValidationError, 400);
    }
    throw new AppError("Please upload a video file", 400);
  }

  const uploaderFromToken = req.user?.id;
  if (!uploaderFromToken) {
    throw new AppError("Unauthorized", 401);
  }

  if (req.body?.uploader && String(req.body.uploader) !== String(uploaderFromToken)) {
    throw new AppError("uploader does not match token", 403);
  }

  const videotitle = String(req.body?.videotitle || "").trim();
  if (!videotitle) throw new AppError("videotitle is required", 400);

  const videochanel = String(req.body?.videochanel || "").trim();
  if (!videochanel) throw new AppError("videochanel is required", 400);

  let videoUpload;
  let thumbnailUpload;
  try {
    videoUpload = await uploadVideoFile(videoFile);
    if (thumbnailFile) {
      thumbnailUpload = await uploadThumbnailFile(thumbnailFile);
    }
  } catch (err) {
    if (err?.statusCode) throw err;
    throw new AppError(err?.message || "Upload failed", 502);
  }

  const doc = new Video({
    videotitle,
    category: req.body.category,
    filename: videoFile.originalname,
    filepath: videoUpload.secure_url,
    filetype: videoFile.mimetype,
    filesize: String(videoFile.size ?? ""),
    thumbnailUrl: thumbnailUpload?.secure_url || "",
    cloudinary: {
      videoPublicId: videoUpload.public_id || "",
      thumbnailPublicId: thumbnailUpload?.public_id || "",
    },
    videochanel,
    uploader: uploaderFromToken,
  });

  await doc.save();
  return sendSuccess(res, doc, 201);
};

// Backward-compatible export (older code imports `uploadvideo`)
export const uploadvideo = uploadVideo;

export const getallvideo = async (req, res) => {
  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "8"), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 8;
  const limit = Math.min(limitUncapped, 50);

  const query = {};
  if (req.query.uploader) {
    query.uploader = String(req.query.uploader);
  }

  const category = String(req.query.category ?? "").trim();
  if (category && category.toLowerCase() !== "all") {
    query.category = category;
  }

  const q = String(req.query.q ?? "").trim();
  if (q) {
    const safe = escapeRegex(q);
    const rx = new RegExp(safe, "i");
    query.$or = [{ videotitle: rx }, { videochanel: rx }];
  }

  const sortKey = String(req.query.sort ?? "latest").toLowerCase();
  const sort =
    sortKey === "trending"
      ? { views: -1, createdAt: -1 }
      : sortKey === "mostliked"
        ? { Like: -1, createdAt: -1 }
        : { createdAt: -1 };

  const total = await Video.countDocuments(query);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : page;
  const skip = (currentPage - 1) * limit;

  const files = await Video.find(query).sort(sort).skip(skip).limit(limit);

  return sendSuccess(
    res,
    {
      items: files,
      totalPages,
      currentPage,
    },
    200
  );
};

export const getvideobyid = async (req, res) => {
  const { id } = req.params;
  const file = await Video.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!file) {
    throw new AppError("Video not found", 404);
  }

  return sendSuccess(res, file, 200);
};
