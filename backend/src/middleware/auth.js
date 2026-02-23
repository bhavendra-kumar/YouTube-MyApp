import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../services/tokens.js";

export default function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new AppError("No token provided", 401));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded?.sub || decoded?.id,
      email: decoded?.email,
      role: decoded?.role || "user",
      tid: decoded?.tid,
    };
    return next();
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return next(new AppError("Access token expired", 401));
    }
    return next(new AppError("Invalid token", 401));
  }
}
