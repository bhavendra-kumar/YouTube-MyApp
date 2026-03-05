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
  plan: { type: String, enum: ["FREE", "PREMIUM"], default: "FREE", index: true },
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
