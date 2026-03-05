import crypto from "crypto";

import User from "../models/user.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { getRazorpayClient } from "../services/razorpay.js";

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export const createOrder = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const amount = Number(env.razorpay?.premiumAmountPaise || 10000);
  const currency = String(env.razorpay?.premiumCurrency || "INR").toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Invalid premium amount configuration", 500);
  }

  const razorpay = getRazorpayClient();

  const receipt = `premium_${String(userId)}_${Date.now()}`;
  const order = await razorpay.orders.create({
    amount,
    currency,
    receipt,
    notes: {
      userId: String(userId),
      plan: "PREMIUM",
    },
  });

  return sendSuccess(
    res,
    {
      keyId: env.razorpay.keyId,
      order,
    },
    200
  );
};

export const verifyPayment = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const orderId = String(req.body?.razorpay_order_id || "").trim();
  const paymentId = String(req.body?.razorpay_payment_id || "").trim();
  const signature = String(req.body?.razorpay_signature || "").trim();

  if (!orderId || !paymentId || !signature) {
    throw new AppError("Missing Razorpay verification fields", 400);
  }

  const keySecret = String(env.razorpay?.keySecret || "").trim();
  if (!keySecret) {
    throw new AppError("Razorpay secret is not configured", 500);
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!safeEqual(expected, signature)) {
    throw new AppError("Invalid payment signature", 400);
  }

  // Optional but recommended: fetch and validate order/payment server-side.
  // This prevents upgrading with a valid signature for a different amount.
  const razorpay = getRazorpayClient();

  try {
    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(orderId),
      razorpay.payments.fetch(paymentId),
    ]);

    const expectedAmount = Number(env.razorpay?.premiumAmountPaise || 10000);
    const expectedCurrency = String(env.razorpay?.premiumCurrency || "INR").toUpperCase();

    if (Number(order?.amount) !== expectedAmount || String(order?.currency || "").toUpperCase() !== expectedCurrency) {
      throw new AppError("Payment amount mismatch", 400);
    }

    if (String(payment?.order_id || "") !== String(orderId)) {
      throw new AppError("Payment does not match order", 400);
    }

    const status = String(payment?.status || "").toLowerCase();
    if (status !== "captured" && status !== "authorized") {
      throw new AppError("Payment not completed", 400);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Could not validate payment with Razorpay", 502);
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan: "PREMIUM",
        downloadsToday: 0,
        lastDownloadDate: null,
      },
    },
    { new: true }
  )
    .select("-passwordHash")
    .lean();

  if (!updated) throw new AppError("User not found", 404);

  return sendSuccess(res, updated, 200);
};
