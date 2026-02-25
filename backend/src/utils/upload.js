import multer from "multer";

const storage = multer.memoryStorage();

const allowedVideoTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const allowedCaptionTypes = new Set([
  "text/vtt",
  "application/x-subrip",
  "text/plain",
  "application/octet-stream",
]);

const filefilter = (req, file, cb) => {
  const field = String(file?.fieldname || "").toLowerCase();
  const type = String(file?.mimetype || "").toLowerCase();
  const originalName = String(file?.originalname || "").toLowerCase();

  if (field === "thumbnail" || field === "avatar" || field === "banner") {
    const ok = allowedImageTypes.has(type);
    if (!ok) req.fileValidationError = "Invalid image type. Use jpg/png/webp/gif.";
    return cb(null, ok);
  }

  if (field === "caption" || field === "captions") {
    const hasAllowedExt = originalName.endsWith(".vtt") || originalName.endsWith(".srt");
    const ok = allowedCaptionTypes.has(type) && hasAllowedExt;
    if (!ok) req.fileValidationError = "Invalid caption type. Upload .vtt (recommended) or .srt.";
    return cb(null, ok);
  }

  // Default to treating as video (fields: file, video)
  const ok = allowedVideoTypes.has(type);
  if (!ok) req.fileValidationError = "Invalid video type. Use mp4/webm/mov/avi.";
  return cb(null, ok);
};

const upload = multer({
  storage,
  fileFilter: filefilter,
  limits: {
    fileSize: 110 * 1024 * 1024,
  },
});
export default upload;
