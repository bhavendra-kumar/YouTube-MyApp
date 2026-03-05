import Razorpay from "razorpay";

import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

let client = null;

export function getRazorpayClient() {
  if (client) return client;

  const keyId = String(env.razorpay?.keyId || "").trim();
  const keySecret = String(env.razorpay?.keySecret || "").trim();

  if (!keyId || !keySecret) {
    throw new AppError(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      500
    );
  }

  client = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return client;
}
