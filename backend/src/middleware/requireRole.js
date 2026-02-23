import { AppError } from "../utils/AppError.js";

export const requireRole = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return next(new AppError("Unauthorized", 401));
    if (!roles.includes(role)) return next(new AppError("Forbidden", 403));
    return next();
  };
};
