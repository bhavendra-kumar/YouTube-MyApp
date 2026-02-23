import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  if (!env.dbUrl) {
    throw new Error("DB_URL is not configured");
  }

  await mongoose.connect(env.dbUrl);
  return mongoose.connection;
}
