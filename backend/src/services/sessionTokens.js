import crypto from "crypto";

import RefreshToken from "../models/refreshToken.js";
import { env } from "../config/env.js";
import { getRefreshCookieOptions } from "../utils/cookies.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
} from "./tokens.js";

function durationToMs(value, fallbackMs) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return fallbackMs;
  const trimmed = value.trim();
  if (!trimmed) return fallbackMs;

  // Supports: '60s', '15m', '12h', '30d' and bare seconds like '3600'
  const match = trimmed.match(/^([0-9]+)\s*([smhd])?$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return fallbackMs;
  const unit = (match[2] || "s").toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[unit] ?? 1000);
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(env.cookie.refreshTokenName, refreshToken, {
    ...getRefreshCookieOptions(),
  });
}

/**
 * Issues access + refresh tokens for a user and sets refresh cookie on the response.
 * Returns the access token and the refresh token hash (for revocation chains).
 */
export async function issueTokensForUser(res, user) {
  const accessToken = signAccessToken(user);

  const expiresAt = new Date(
    Date.now() + durationToMs(env.refreshTokenTtl, 1000 * 60 * 60 * 24 * 30)
  );

  // NOTE: `RefreshToken.tokenHash` is unique. Using a constant placeholder
  // (like "pending") can race when multiple logins happen concurrently.
  // We generate a unique placeholder upfront and then replace it with the
  // real hash once the signed refresh token is created.
  const placeholderHash = crypto.randomBytes(32).toString("hex");
  const tokenDoc = await RefreshToken.create({
    user: user._id,
    tokenHash: placeholderHash,
    expiresAt,
  });

  const refreshToken = signRefreshToken(user, tokenDoc._id);
  const refreshHash = hashToken(refreshToken);
  await RefreshToken.findByIdAndUpdate(tokenDoc._id, {
    $set: { tokenHash: refreshHash },
  });

  setRefreshCookie(res, refreshToken);
  return { accessToken, refreshHash };
}
