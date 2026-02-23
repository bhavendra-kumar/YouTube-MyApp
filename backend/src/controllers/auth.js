import bcrypt from "bcrypt";
import mongoose from "mongoose";

import User from "../models/user.js";
import RefreshToken from "../models/refreshToken.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { getRefreshCookieOptions } from "../utils/cookies.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../services/tokens.js";

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

function getRefreshTokenFromRequest(req) {
  const cookieName = env.cookie.refreshTokenName;
  const fromCookie = req.cookies?.[cookieName];
  if (fromCookie) return fromCookie;

  const fromBody = req.body?.refreshToken;
  if (fromBody) return fromBody;
  return null;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(env.cookie.refreshTokenName, refreshToken, {
    ...getRefreshCookieOptions(),
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.cookie.refreshTokenName, {
    ...getRefreshCookieOptions(),
  });
}

async function getSafeUserById(userId) {
  return User.findById(userId).select("-passwordHash");
}

async function issueTokensForUser(res, user) {
  const accessToken = signAccessToken(user);

  const expiresAt = new Date(
    Date.now() + durationToMs(env.refreshTokenTtl, 1000 * 60 * 60 * 24 * 30)
  );
  const tokenDoc = await RefreshToken.create({
    user: user._id,
    tokenHash: "pending",
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

export const register = async (req, res) => {
  const { email, password, name, image } = req.body;

  const existing = await User.findOne({ email }).select("_id");
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(String(password), 12);
  const created = await User.create({ email, passwordHash, name, image, role: "user" });

  const user = await getSafeUserById(created._id);
  if (!user) throw new AppError("User not found", 500);

  const { accessToken } = await issueTokensForUser(res, user);
  return sendSuccess(res, { result: user, token: accessToken }, 201);
};

export const login = async (req, res) => {
  const { email, password, name, image } = req.body;
  if (!email) throw new AppError("email is required", 400);

  const wantsPassword = typeof password === "string" && password.length > 0;

  if (wantsPassword) {
    const userWithPassword = await User.findOne({ email }).select(
      "+passwordHash email role"
    );

    if (!userWithPassword) throw new AppError("Invalid email or password", 401);
    if (!userWithPassword.passwordHash)
      throw new AppError("Password login not enabled for this user", 401);

    const ok = await bcrypt.compare(
      String(password),
      String(userWithPassword.passwordHash)
    );
    if (!ok) throw new AppError("Invalid email or password", 401);

    const safeUser = await getSafeUserById(userWithPassword._id);
    const { accessToken } = await issueTokensForUser(res, safeUser);
    return sendSuccess(res, { result: safeUser, token: accessToken }, 200);
  }

  const existingUser = await User.findOne({ email });
  const created = existingUser ? null : await User.create({ email, name, image, role: "user" });
  const finalUserId = existingUser?._id || created?._id;
  if (!finalUserId) throw new AppError("User not found", 500);
  const finalUser = await getSafeUserById(finalUserId);
  if (!finalUser) throw new AppError("User not found", 500);

  const { accessToken } = await issueTokensForUser(res, finalUser);
  return sendSuccess(
    res,
    { result: finalUser, token: accessToken },
    existingUser ? 200 : 201
  );
};

export const refresh = async (req, res) => {
  const raw = getRefreshTokenFromRequest(req);
  if (!raw) throw new AppError("No refresh token provided", 401);

  let decoded;
  try {
    decoded = verifyRefreshToken(raw);
  } catch (err) {
    if (err?.name === "TokenExpiredError") throw new AppError("Refresh token expired", 401);
    throw new AppError("Invalid refresh token", 401);
  }

  const userId = decoded?.sub;
  const tokenId = decoded?.tid;
  if (!userId || !tokenId) throw new AppError("Invalid refresh token", 401);
  if (!mongoose.Types.ObjectId.isValid(tokenId)) throw new AppError("Invalid refresh token", 401);

  const tokenHash = hashToken(raw);
  const tokenDoc = await RefreshToken.findOne({ _id: tokenId, tokenHash });
  if (!tokenDoc || tokenDoc.revokedAt) throw new AppError("Refresh token revoked", 401);
  if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() < Date.now()) {
    throw new AppError("Refresh token expired", 401);
  }

  const user = await getSafeUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  const { accessToken, refreshHash } = await issueTokensForUser(res, user);
  await RefreshToken.findByIdAndUpdate(tokenDoc._id, {
    $set: {
      revokedAt: new Date(),
      replacedByTokenHash: refreshHash,
    },
  });

  return sendSuccess(res, { token: accessToken, result: user }, 200);
};

export const logout = async (req, res) => {
  const raw = getRefreshTokenFromRequest(req);
  clearRefreshCookie(res);

  if (raw) {
    try {
      const decoded = verifyRefreshToken(raw);
      const tokenId = decoded?.tid;
      if (tokenId && mongoose.Types.ObjectId.isValid(tokenId)) {
        await RefreshToken.findByIdAndUpdate(tokenId, { $set: { revokedAt: new Date() } });
      }
    } catch {
      // ignore
    }
  }

  return sendSuccess(res, { loggedOut: true }, 200);
};

export const me = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);
  const user = await getSafeUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  return sendSuccess(res, user, 200);
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;

  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;
  if (!requesterId) throw new AppError("Unauthorized", 401);
  if (String(requesterId) !== String(_id) && requesterRole !== "admin") {
    throw new AppError("Forbidden", 403);
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    throw new AppError("User unavailable...", 400);
  }

  const updatedata = await User.findByIdAndUpdate(
    _id,
    {
      $set: {
        channelname,
        description,
      },
    },
    { new: true }
  ).select("-passwordHash");

  return sendSuccess(res, updatedata, 201);
};

export const getuser = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    throw new AppError("Invalid user id", 400);
  }

  const existingUser = await User.findById(_id).select("-passwordHash");
  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  return sendSuccess(res, existingUser, 200);
};

