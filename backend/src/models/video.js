import mongoose from "mongoose";

const videochema = mongoose.Schema(
  {
    videotitle: { type: String, required: true },
    contentType: { type: String, enum: ["video", "short"], default: "video" },
    category: { type: String, default: "All" },
    isShort: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    filename: { type: String, required: true },
    filetype: { type: String, required: true },
    filepath: { type: String, required: true },
    sources: {
      type: [
        {
          src: { type: String, required: true },
          label: { type: String, required: true },
          type: { type: String, default: "video/mp4" },
        },
      ],
      default: [],
    },
    captions: {
      type: [
        {
          src: { type: String, required: true },
          label: { type: String, default: "" },
          lang: { type: String, required: true },
          default: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    thumbnailUrl: { type: String, default: "" },
    cloudinary: {
      videoPublicId: { type: String, default: "" },
      thumbnailPublicId: { type: String, default: "" },
    },
    duration: { type: String, default: "" },
    filesize: { type: String, required: true },
    videochanel: { type: String, required: true },
    Like: { type: Number, default: 0 },
    Dislike: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0 },
    totalWatchTime: { type: Number, default: 0 },
    averageWatchTime: { type: Number, default: 0 },
    watchTimeCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: { type: String },
  },
  {
    timestamps: true,
  }
);

videochema.index({ category: 1 });
videochema.index({ createdAt: -1 });
videochema.index({ trendingScore: -1 });
videochema.index({ tags: "text" });

export default mongoose.model("videofiles", videochema);
