import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    videos: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "videofiles",
        },
      ],
      default: [],
    },
    visibility: {
      type: String,
      enum: ["public", "unlisted", "private"],
      default: "public",
    },
  },
  { timestamps: true }
);

playlistSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model("playlist", playlistSchema);
