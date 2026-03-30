import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  bannerUrl: { type: String },
  // Boolean flag used by newer premium/download logic.
  // Kept alongside `plan` to avoid breaking legacy features.
  isPremium: { type: Boolean, default: false, index: true },
  // Keep "PREMIUM" as a legacy alias for GOLD to avoid breaking existing user records.
  plan: { type: String, enum: ["FREE", "BRONZE", "SILVER", "GOLD", "PREMIUM"], default: "FREE", index: true },
  planPurchasedAt: { type: Date, default: null },
  planAmountPaid: { type: Number, default: 0 },
  invoiceId: { type: String, default: null },
  // Newer naming (kept in sync with downloadsToday where possible)
  dailyDownloadCount: { type: Number, default: 0 },
  downloadsToday: { type: Number, default: 0 },
  lastDownloadDate: { type: Date, default: null },
  downloadHistory: {
    type: [
      {
        videoId: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles", required: true },
        downloadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
