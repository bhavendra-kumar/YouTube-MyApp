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

const filefilter = (req, file, cb) => {
  const field = String(file?.fieldname || "").toLowerCase();
  const type = String(file?.mimetype || "").toLowerCase();

  if (field === "thumbnail") {
    const ok = allowedImageTypes.has(type);
    if (!ok) req.fileValidationError = "Invalid thumbnail type. Use jpg/png/webp/gif.";
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
