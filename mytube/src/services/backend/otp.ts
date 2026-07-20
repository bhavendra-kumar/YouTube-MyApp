// @ts-nocheck
import mongoose from "mongoose";
import User from "@/models/user";
import OtpModel, { hashOtp, generateOtp } from "@/models/otp";
import { env } from "@/lib/config/env";
import { AppError } from "@/lib/backend-utils/AppError";
import { sendSuccess } from "@/lib/backend-utils/apiResponse";
import { sendOtpEmail } from "@/services/backend/emailService";
import { issueTokensForUser } from "@/services/backend/sessionTokens";

// South Indian states (lowercase) recognized as "South India"
const SOUTH_INDIA_STATES = [
  "tamil nadu", "tamilnadu", "kerala", "karnataka", "andhra pradesh",
  "andhrapradesh", "telangana", "pondicherry", "puducherry",
];

function isSouthIndianState(state) {
  if (!state) return false;
  return SOUTH_INDIA_STATES.some((s) => String(state).toLowerCase().includes(s));
}

function isInIstMorningWindow(now = new Date()) {
  // IST = UTC+5:30. We compute in UTC getters after shifting.
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const hour = ist.getUTCHours();
  return hour >= 10 && hour < 12;
}

/**
 * POST /user/otp/send
 * Body: { userId, state, channel }
 * channel: "email" (south india 10-12 IST) or "sms" (others)
 */
export const sendOtp = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { userId, state, channel: requestedChannel } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("userId is required", 400);
  }

  const user = await User.findById(userId).select("name email").lean();
  if (!user) throw new AppError("User not found", 404);

  const south = isSouthIndianState(state);
  const morning = isInIstMorningWindow();
  const isRequestedChannelValid = requestedChannel === "email" || requestedChannel === "sms";
  const defaultChannel = env.otp?.defaultChannel;

  // Channel selection precedence:
  // 1) Explicit request body
  // 2) Env override (OTP_DEFAULT_CHANNEL)
  // 3) Existing rule: South India + 10:00–12:00 IST => email OTP, else SMS (mock)
  let channel = isRequestedChannelValid
    ? requestedChannel
    : (defaultChannel === "email" || defaultChannel === "sms")
      ? defaultChannel
      : south && morning
        ? "email"
        : "sms";

  // Invalidate any existing unused OTP for this user
  await OtpModel.updateMany(
    { userId, used: false },
    { $set: { used: true } }
  );

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiryMinutes = env.otp?.expiryMinutes || 10;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await OtpModel.create({ userId, codeHash, channel, expiresAt });

  let sent = false;
  let deliveryReason = "";

  if (env.nodeEnv !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `[otp] Sending OTP via ${channel} to ${String(user.email || "").trim()} (userId=${String(userId)})`
    );
  }

  if (channel === "email") {
    const result = await sendOtpEmail({ to: user.email, otp, name: user.name, expiryMinutes });
    sent = Boolean(result?.sent);
    deliveryReason = String(result?.reason || "");

    if (!sent && env.nodeEnv === "production") {
      throw new AppError(
        "OTP email could not be sent (SMTP not configured). Set SMTP_HOST/SMTP_USER/SMTP_PASS.",
        500
      );
    }
  } else {
    // SMS: not integrated here yet. If you want SMS OTP, wire up Twilio/MSG91 etc.
    // For now, fall back to email so users receive the OTP.
    if (user.email) {
      const result = await sendOtpEmail({ to: user.email, otp, name: user.name, expiryMinutes });
      sent = Boolean(result?.sent);
      deliveryReason = String(result?.reason || "");
    } else {
      // eslint-disable-next-line no-console
      console.log(`[SMS OTP MOCK] To user ${userId} | OTP: ${otp}`);
      sent = true;
    }
  }

  return sendSuccess(
    res,
    {
      sent,
      channel,
      ...(deliveryReason ? { reason: deliveryReason } : {}),
      // Optional debug: echo OTP in response only when explicitly enabled.
      ...(env.nodeEnv !== "production" && env.otp?.debugEcho ? { otp } : {}),
    },
    200
  );
};

/**
 * POST /user/otp/verify
 * Body: { userId, code }
 */
export const verifyOtp = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { userId, code } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("userId is required", 400);
  }
  if (!code) throw new AppError("OTP code is required", 400);

  const codeHash = hashOtp(String(code).trim());

  const otpDoc = await OtpModel.findOne({
    userId,
    codeHash,
    used: false,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!otpDoc) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  await OtpModel.findByIdAndUpdate(otpDoc._id, { $set: { used: true } });

  const user = await User.findById(userId).select("-passwordHash").lean();
  if (!user) throw new AppError("User not found", 404);

  const { accessToken } = await issueTokensForUser(res, user);
  return { data: { verified: true, token: accessToken, user, result: user }, status: 200, cookies: resContext.cookies };
};
