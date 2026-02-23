import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

function requireSecret(value, name) {
  if (!value) throw new AppError(`${name} is not configured`, 500);
  return value;
}

export function signAccessToken(user) {
  const secret = requireSecret(env.accessTokenSecret, "ACCESS_TOKEN_SECRET");
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role || "user",
    },
    secret,
    { expiresIn: env.accessTokenTtl }
  );
}

export function signRefreshToken(user, tokenId) {
  const secret = requireSecret(env.refreshTokenSecret, "REFRESH_TOKEN_SECRET");
  return jwt.sign(
    {
      sub: String(user._id),
      tid: String(tokenId),
      role: user.role || "user",
    },
    secret,
    { expiresIn: env.refreshTokenTtl }
  );
}

export function verifyAccessToken(token) {
  const secret = requireSecret(env.accessTokenSecret, "ACCESS_TOKEN_SECRET");
  return jwt.verify(token, secret);
}

export function verifyRefreshToken(token) {
  const secret = requireSecret(env.refreshTokenSecret, "REFRESH_TOKEN_SECRET");
  return jwt.verify(token, secret);
}

export function hashToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}
