import { env } from "../config/env.js";

export function errorHandler(err, req, res, next) {
  let statusCode = Number(err?.statusCode) || 500;
  let message = err?.message || "Server Error";

  if (err?.name === "MulterError") {
    statusCode = 400;
    if (err?.code === "LIMIT_FILE_SIZE") {
      message = "File too large";
    }
  }

  if (env.nodeEnv !== "test") {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === "production" ? {} : { stack: err?.stack }),
  });
}
