import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    commentedon: { type: Date, default: Date.now },

    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
      default: [],
    },
    dislikes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
      default: [],
    },
    city: { type: String, default: "Unknown" },
    originalLanguage: { type: String, default: "unknown" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

commentschema.index({ videoid: 1, isDeleted: 1, createdAt: -1 });

export default mongoose.model("comment", commentschema);
