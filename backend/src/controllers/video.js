import Video from "../models/video.js";
import Like from "../models/like.js";
import Dislike from "../models/dislike.js";
import WatchLater from "../models/watchlater.js";
import History from "../models/history.js";
import Comment from "../models/comment.js";
import Playlist from "../models/playlist.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { calculateTrendingScore } from "../utils/trendingScore.js";
import { uploadCaptionFile, uploadThumbnailFile, uploadVideoFile } from "../services/uploadService.js";
import { cacheGetJson, cacheSetJson } from "../services/cache.js";
import { withMediaUrls } from "../utils/mediaUrl.js";

const VIDEO_LIST_SELECT =
  "videotitle filepath thumbnailUrl videochanel views createdAt duration category contentType isShort uploader Like Dislike commentsCount trendingScore";

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

function safeJsonParse(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw === "object") return raw;
  const text = String(raw).trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function inferLangFromFilename(name) {
  const base = String(name || "").toLowerCase();
  // Try: captions.en.vtt, captions_en.vtt, en.vtt
  const m = base.match(/(?:^|[._-])([a-z]{2})(?:[._-]|\.(vtt|srt)$)/i);
  return m?.[1] ? m[1].toLowerCase() : "en";
}

export const uploadVideo = async (req, res) => {
  const videoFile = pickFirstFile(req, ["video", "file"]);
  const thumbnailFile = pickFirstFile(req, ["thumbnail"]);
  const captionFiles = [
    ...(req?.files?.caption || []),
    ...(req?.files?.captions || []),
  ];

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

  const rawContentType = String(req.body?.contentType || "video").toLowerCase().trim();
  const contentType = rawContentType === "short" ? "short" : "video";
  const isShort = contentType === "short";

  let videoUpload;
  let thumbnailUpload;
  const captionUploads = [];
  try {
    videoUpload = await uploadVideoFile(videoFile);
    if (thumbnailFile) {
      thumbnailUpload = await uploadThumbnailFile(thumbnailFile);
    }

    for (const f of captionFiles) {
      // .vtt/.srt stored as raw
      // eslint-disable-next-line no-await-in-loop
      const up = await uploadCaptionFile(f);
      captionUploads.push({ file: f, upload: up });
    }
  } catch (err) {
    if (err?.statusCode) throw err;
    throw new AppError(err?.message || "Upload failed", 502);
  }

  // Optional JSON fields (multipart form fields come through as strings)
  const rawSources = safeJsonParse(req.body?.sources, null);
  const rawCaptions = safeJsonParse(req.body?.captions, null);

  const sources = Array.isArray(rawSources)
    ? rawSources
        .map((s) => ({
          src: String(s?.src || "").trim(),
          label: String(s?.label || "").trim(),
          type: String(s?.type || "video/mp4").trim() || "video/mp4",
        }))
        .filter((s) => s.src && s.label)
    : [];

  const captions = Array.isArray(rawCaptions)
    ? rawCaptions
        .map((t) => ({
          src: String(t?.src || "").trim(),
          label: String(t?.label || "").trim(),
          lang: String(t?.lang || "").trim().toLowerCase(),
          default: Boolean(t?.default),
        }))
        .filter((t) => t.src && t.lang)
    : [];

  // Include uploaded caption files in captions[]
  for (const item of captionUploads) {
    const lang = inferLangFromFilename(item.file?.originalname);
    const label = String(item.file?.originalname || "").replace(/\.(vtt|srt)$/i, "").slice(0, 60);
    captions.push({
      src: item.upload.secure_url,
      lang,
      label: label || lang.toUpperCase(),
      default: false,
    });
  }

  // Ensure at least one source exists
  const finalSources = sources.length
    ? sources
    : [
        {
          src: videoUpload.secure_url,
          label: "Auto",
          type: videoFile.mimetype || "video/mp4",
        },
      ];

  const doc = new Video({
    videotitle,
    contentType,
    isShort,
    category: req.body.category,
    filename: videoFile.originalname,
    filepath: videoUpload.secure_url,
    filetype: videoFile.mimetype,
    filesize: String(videoFile.size ?? ""),
    sources: finalSources,
    captions,
    thumbnailUrl: thumbnailUpload?.secure_url || "",
    cloudinary: {
      videoPublicId: videoUpload.public_id || "",
      thumbnailPublicId: thumbnailUpload?.public_id || "",
    },
    videochanel,
    uploader: uploaderFromToken,
  });

  await doc.save();
  return sendSuccess(res, withMediaUrls(doc.toObject(), req), 201);
};

// Backward-compatible export (older code imports `uploadvideo`)
export const uploadvideo = uploadVideo;

export const getallvideo = async (req, res) => {
  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const limit = Math.min(limitUncapped, 50);

  const query = {};
  if (req.query.uploader) {
    query.uploader = String(req.query.uploader);
  }

  const contentType = String(req.query.contentType ?? "").trim().toLowerCase();
  if (contentType === "short" || contentType === "video") {
    query.contentType = contentType;
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

  const files = await Video.find(query)
    .select(VIDEO_LIST_SELECT)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return sendSuccess(
    res,
    {
      items: Array.isArray(files) ? files.map((v) => withMediaUrls(v, req)) : [],
      totalPages,
      currentPage,
    },
    200
  );
};

export const getHomeFeed = async (req, res) => {
  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);
  const rawNow = Number.parseInt(String(req.query.now ?? ""), 10);

  const pageUncapped = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const limit = Math.min(limitUncapped, 50);

  const cacheKey = `video:homefeed:v2:page=${pageUncapped}:limit=${limit}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached && typeof cached === "object") {
    return res.status(200).json(cached);
  }

  const total = await Video.countDocuments({});
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const page = totalPages > 0 ? Math.min(pageUncapped, totalPages) : pageUncapped;
  const skip = (page - 1) * limit;

  const nowMsUnbucketed = Number.isFinite(rawNow) && rawNow > 0 ? rawNow : Date.now();
  // Bucket "now" to the minute so trendingScore ordering is stable across
  // subsequent page fetches (prevents overlap/duplicates during infinite scroll).
  const nowMs = Math.floor(nowMsUnbucketed / 60_000) * 60_000;
  const nowDate = new Date(nowMs);

  const dataRaw = await Video.aggregate([
    {
      $addFields: {
        _createdAtMs: {
          $toLong: {
            $ifNull: ["$createdAt", nowDate],
          },
        },
      },
    },
    {
      $addFields: {
        _hoursSinceUpload: {
          $max: [
            0,
            {
              $divide: [
                { $subtract: [nowMs, "$_createdAtMs"] },
                1000 * 60 * 60,
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        trendingScore: {
          $divide: [
            {
              $add: [
                {
                  $multiply: [{ $ifNull: ["$views", 0] }, 0.5],
                },
                {
                  $multiply: [{ $ifNull: ["$Like", 0] }, 0.3],
                },
                {
                  $multiply: [{ $ifNull: ["$commentsCount", 0] }, 0.2],
                },
              ],
            },
            {
              $pow: [{ $add: ["$_hoursSinceUpload", 2] }, 1.5],
            },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1, createdAt: -1, _id: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        videotitle: 1,
        filepath: 1,
        thumbnailUrl: 1,
        videochanel: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        category: 1,
        contentType: 1,
        isShort: 1,
        uploader: 1,
        Like: 1,
        Dislike: 1,
        commentsCount: 1,
        trendingScore: 1,
      },
    },
  ]);

  const data = Array.isArray(dataRaw)
    ? dataRaw.map((v) =>
        withMediaUrls(
          {
            ...v,
            trendingScore: calculateTrendingScore(v, nowMs),
          },
          req
        )
      )
    : [];

  const payload = {
    success: true,
    page,
    total,
    data,

  };

  await cacheSetJson(cacheKey, payload, 60);
  return res.status(200).json(payload);
};

export const getShortsFeed = async (req, res) => {
  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);
  const rawNow = Number.parseInt(String(req.query.now ?? ""), 10);

  const pageUncapped = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const limit = Math.min(limitUncapped, 50);

  const cacheKey = `video:shortsfeed:v2:page=${pageUncapped}:limit=${limit}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached && typeof cached === "object") {
    return res.status(200).json(cached);
  }

  const query = { isShort: true };
  const total = await Video.countDocuments(query);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const page = totalPages > 0 ? Math.min(pageUncapped, totalPages) : pageUncapped;
  const skip = (page - 1) * limit;

  const nowMsUnbucketed = Number.isFinite(rawNow) && rawNow > 0 ? rawNow : Date.now();
  const nowMs = Math.floor(nowMsUnbucketed / 60_000) * 60_000;
  const nowDate = new Date(nowMs);

  const dataRaw = await Video.aggregate([
    { $match: query },
    {
      $addFields: {
        _createdAtMs: {
          $toLong: {
            $ifNull: ["$createdAt", nowDate],
          },
        },
      },
    },
    {
      $addFields: {
        _hoursSinceUpload: {
          $max: [
            0,
            {
              $divide: [
                { $subtract: [nowMs, "$_createdAtMs"] },
                1000 * 60 * 60,
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        trendingScore: {
          $divide: [
            {
              $add: [
                { $multiply: [{ $ifNull: ["$views", 0] }, 0.5] },
                { $multiply: [{ $ifNull: ["$Like", 0] }, 0.3] },
                { $multiply: [{ $ifNull: ["$commentsCount", 0] }, 0.2] },
              ],
            },
            { $pow: [{ $add: ["$_hoursSinceUpload", 2] }, 1.5] },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1, createdAt: -1, _id: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        videotitle: 1,
        filepath: 1,
        thumbnailUrl: 1,
        videochanel: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        category: 1,
        contentType: 1,
        isShort: 1,
        uploader: 1,
        Like: 1,
        Dislike: 1,
        commentsCount: 1,
        trendingScore: 1,
      },
    },
  ]);

  const data = Array.isArray(dataRaw)
    ? dataRaw.map((v) =>
        withMediaUrls(
          {
            ...v,
            trendingScore: calculateTrendingScore(v, nowMs),
          },
          req
        )
      )
    : [];

  const payload = {
    success: true,
    page,
    total,
    data,

  };

  await cacheSetJson(cacheKey, payload, 60);
  return res.status(200).json(payload);
};

export const postWatchTime = async (req, res) => {
  const videoId = req.body?.videoId;
  const watchedSecondsRaw = req.body?.watchedSeconds;

  if (!videoId) {
    throw new AppError("videoId is required", 400);
  }

  const watchedSeconds = Number(watchedSecondsRaw);
  if (!Number.isFinite(watchedSeconds) || watchedSeconds <= 0) {
    throw new AppError("watchedSeconds must be a positive number", 400);
  }

  let video;
  try {
    video = await Video.findById(videoId);
  } catch {
    throw new AppError("Invalid videoId", 400);
  }

  if (!video) {
    throw new AppError("Video not found", 404);
  }

  const nextTotalWatchTime = Number(video.totalWatchTime ?? 0) + watchedSeconds;
  const nextWatchTimeCount = Number(video.watchTimeCount ?? 0) + 1;
  const nextAverageWatchTime = nextWatchTimeCount > 0 ? nextTotalWatchTime / nextWatchTimeCount : 0;

  video.totalWatchTime = nextTotalWatchTime;
  video.watchTimeCount = nextWatchTimeCount;
  video.averageWatchTime = nextAverageWatchTime;

  video.trendingScore = calculateTrendingScore(video);

  await video.save();
  return sendSuccess(res, withMediaUrls(video.toObject(), req), 200);
};

export const getvideobyid = async (req, res) => {
  const { id } = req.params;
  const file = await Video.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!file) {
    throw new AppError("Video not found", 404);
  }

  return sendSuccess(res, withMediaUrls(file, req), 200);
};

export const updateMyVideo = async (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!id) {
    throw new AppError("id is required", 400);
  }

  let video;
  try {
    video = await Video.findById(id);
  } catch {
    throw new AppError("Invalid id", 400);
  }

  if (!video) {
    throw new AppError("Video not found", 404);
  }

  if (String(video.uploader || "") !== String(userId)) {
    throw new AppError("Forbidden", 403);
  }

  const nextTitleRaw = req.body?.videotitle;
  const nextCategoryRaw = req.body?.category;

  const updates = {};
  if (typeof nextTitleRaw === "string") {
    const t = nextTitleRaw.trim();
    if (!t) throw new AppError("videotitle cannot be empty", 400);
    updates.videotitle = t;
  }

  if (typeof nextCategoryRaw === "string") {
    const c = nextCategoryRaw.trim();
    if (c) updates.category = c;
  }

  if (Object.keys(updates).length === 0) {
    return sendSuccess(res, withMediaUrls(video.toObject(), req), 200);
  }

  Object.assign(video, updates);
  // Keep trendingScore consistent (even though title/category don't directly affect it today).
  video.trendingScore = calculateTrendingScore(video);
  await video.save();

  const updated = await Video.findById(id).select(VIDEO_LIST_SELECT).lean();
  return sendSuccess(res, withMediaUrls(updated, req), 200);
};

export const deleteMyVideo = async (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!id) {
    throw new AppError("id is required", 400);
  }

  let video;
  try {
    video = await Video.findById(id).select("_id uploader").lean();
  } catch {
    throw new AppError("Invalid id", 400);
  }

  if (!video) {
    throw new AppError("Video not found", 404);
  }

  if (String(video.uploader || "") !== String(userId)) {
    throw new AppError("Forbidden", 403);
  }

  // Cascade cleanup so client pages that populate video refs don't crash on null videoid.
  await Promise.all([
    Like.deleteMany({ videoid: id }),
    Dislike.deleteMany({ videoid: id }),
    WatchLater.deleteMany({ videoid: id }),
    History.deleteMany({ videoid: id }),
    Comment.deleteMany({ videoid: id }),
    Playlist.updateMany({ videos: id }, { $pull: { videos: id } }),
  ]);

  await Video.findByIdAndDelete(id);
  return sendSuccess(res, { deleted: true, id }, 200);
};
