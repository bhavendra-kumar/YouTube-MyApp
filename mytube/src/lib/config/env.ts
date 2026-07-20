export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl: process.env.DB_URL,
  dbUrlFallback: process.env.DB_URL_FALLBACK,
  redis: {
    url: process.env.REDIS_URL,
  },
  jwtSecret: process.env.JWT_SECRET,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "30d",
  frontendUrl: process.env.FRONTEND_URL,
  cloudinary: {
    cloudName: process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || "youtube-clone",
  },
  cookie: {
    refreshTokenName: process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    premiumAmountPaise: Number.parseInt(process.env.PREMIUM_AMOUNT_PAISE || "10000", 10),
    premiumCurrency: process.env.PREMIUM_CURRENCY || "INR",
    bronzeAmountPaise: Number.parseInt(process.env.BRONZE_AMOUNT_PAISE || "1000", 10),
    silverAmountPaise: Number.parseInt(process.env.SILVER_AMOUNT_PAISE || "5000", 10),
    goldAmountPaise: Number.parseInt(process.env.GOLD_AMOUNT_PAISE || "10000", 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  },
  otp: {
    expiryMinutes: Number.parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10),
    defaultChannel: process.env.OTP_DEFAULT_CHANNEL || "",
    debugEcho: process.env.OTP_DEBUG_ECHO === "1" || String(process.env.OTP_DEBUG_ECHO || "").toLowerCase() === "true",
  },
};
