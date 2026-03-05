import { AppError } from "./AppError.js";

const ALLOWED_COMMENT_REGEX = /^[\p{L}\p{M}\p{N} .,!?]+$/u;

export function validateCommentText(text) {
  if (typeof text !== "string") {
    throw new AppError("Comment text is required", 400);
  }

  const normalized = text.trim();

  if (!normalized) {
    throw new AppError("Comment text cannot be empty", 400);
  }

  if (!ALLOWED_COMMENT_REGEX.test(normalized)) {
    throw new AppError(
      "Comment contains invalid characters. Allowed: letters, numbers, spaces, and . , ! ?",
      400
    );
  }

  return normalized;
}