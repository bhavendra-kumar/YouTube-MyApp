import mongoose from "mongoose";

const videochema = mongoose.Schema(
  {
    videotitle: { type: String, required: true },
    category: { type: String, default: "All" },
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
    filesize: { type: String, required: true },
    videochanel: { type: String, required: true },
    Like: { type: Number, default: 0 },
    Dislike: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("videofiles", videochema);
