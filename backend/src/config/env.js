import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "5000", 10),
  // Public base URL for this backend (used to build absolute media URLs).
  // Recommended in production: https://youtube-myapp.onrender.com
  backendUrl:
    process.env.BACKEND_URL ||
    process.env.PUBLIC_BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.RENDER_EXTERNAL_HOSTNAME
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
      : ""),
  dbUrl: process.env.DB_URL,
  redis: {
    url: process.env.REDIS_URL,
  },
  jwtSecret: process.env.JWT_SECRET,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "30d",
  frontendUrl: process.env.FRONTEND_URL,
  // Optional comma-separated list of extra allowed origins.
  // Example: "https://youtube-myapp.vercel.app,https://youtube-myapp-git-main-team.vercel.app"
  frontendUrls: process.env.FRONTEND_URLS,
  cloudinary: {
    cloudName: process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || "youtube-clone",
  },
  rateLimit: {
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: Number.parseInt(process.env.RATE_LIMIT_MAX || "300", 10),
  },
  cookie: {
    refreshTokenName: process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
  },
};
