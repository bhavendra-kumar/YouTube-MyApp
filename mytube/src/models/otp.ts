// @ts-nocheck
import crypto from "crypto";
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    channel: { type: String, enum: ["email", "sms"], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

otpSchema.index({ userId: 1, createdAt: -1 });

export default (mongoose.models["otp"] || mongoose.model("otp", otpSchema));

export function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
