import { verifyAccessToken } from "../services/tokens.js";

export default function optionalAuth(req, _res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded?.sub || decoded?.id,
      email: decoded?.email,
      role: decoded?.role || "user",
      tid: decoded?.tid,
    };
  } catch {
    // Ignore invalid/expired tokens for optional auth.
  }

  return next();
}
