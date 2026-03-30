import crypto from "crypto";

import User from "../models/user.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { getRazorpayClient } from "../services/razorpay.js";
import { sendInvoiceEmail } from "../services/emailService.js";

// Plan definitions
const PLANS = {
  bronze: {
    name: "BRONZE",
    amountPaise: env.razorpay?.bronzeAmountPaise || 1000,
    watchLimitMinutes: 7,
  },
  silver: {
    name: "SILVER",
    amountPaise: env.razorpay?.silverAmountPaise || 5000,
    watchLimitMinutes: 10,
  },
  gold: {
    name: "GOLD",
    amountPaise: env.razorpay?.goldAmountPaise || 10000,
    watchLimitMinutes: null, // unlimited
  },
  // Legacy support
  premium: {
    name: "GOLD",
    amountPaise: env.razorpay?.goldAmountPaise || 10000,
    watchLimitMinutes: null,
  },
};

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export const createOrder = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const rawPlan = String(req.body?.plan || req.query?.plan || "gold").toLowerCase().trim();
  const plan = PLANS[rawPlan];
  if (!plan) {
    throw new AppError(`Invalid plan. Choose: bronze, silver, gold`, 400);
  }

  const amount = plan.amountPaise;
  const currency = String(env.razorpay?.premiumCurrency || "INR").toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Invalid plan amount configuration", 500);
  }

  const razorpay = getRazorpayClient();

  const receipt = `${rawPlan}_${String(userId)}_${Date.now()}`.slice(0, 40);
  const order = await razorpay.orders.create({
    amount,
    currency,
    receipt,
    notes: {
      userId: String(userId),
      plan: plan.name,
    },
  });

  return sendSuccess(
    res,
    {
      keyId: env.razorpay.keyId,
      order,
      plan: plan.name,
      amountPaise: amount,
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
  const rawPlan = String(req.body?.plan || "gold").toLowerCase().trim();

  if (!orderId || !paymentId || !signature) {
    throw new AppError("Missing Razorpay verification fields", 400);
  }

  const plan = PLANS[rawPlan];
  if (!plan) {
    throw new AppError(`Invalid plan: ${rawPlan}`, 400);
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

  const razorpay = getRazorpayClient();

  let fetchedPayment;
  try {
    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(orderId),
      razorpay.payments.fetch(paymentId),
    ]);
    fetchedPayment = payment;

    const expectedAmount = plan.amountPaise;
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
        isPremium: true,
        plan: plan.name,
        planPurchasedAt: new Date(),
        planAmountPaid: plan.amountPaise,
        invoiceId: `INV-${String(orderId).slice(0, 24)}`,
        downloadsToday: 0,
        dailyDownloadCount: 0,
        lastDownloadDate: null,
      },
    },
    { new: true }
  )
    .select("-passwordHash")
    .lean();

  if (!updated) throw new AppError("User not found", 404);

  // Send invoice email (non-blocking)
  sendInvoiceEmail({
    to: updated.email,
    name: updated.name || updated.channelname,
    plan: plan.name,
    amountPaise: plan.amountPaise,
    paymentId,
    orderId,
  }).catch(() => {});

  return sendSuccess(res, updated, 200);
};
