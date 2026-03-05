import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
      index: true,
    },
    filePath: { type: String, required: true },
    downloadedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Each user should have a single offline copy per video.
downloadSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export default mongoose.model("download", downloadSchema);
