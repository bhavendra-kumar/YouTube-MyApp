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
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
