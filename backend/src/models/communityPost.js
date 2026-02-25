import mongoose from "mongoose";

const communityPostSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

communityPostSchema.index({ channel: 1, createdAt: -1 });

export default mongoose.model("communityPost", communityPostSchema);
