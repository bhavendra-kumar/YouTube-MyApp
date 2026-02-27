import cors from "cors";

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowed = [
      process.env.FRONTEND_URL,
      "https://youtube-myapp.vercel.app",
    ];

    if (
      allowed.includes(origin) ||
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
