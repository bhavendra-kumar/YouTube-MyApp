import mongoose from "mongoose";
import { env } from "@/lib/config/env";

declare global {
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDb() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!env.dbUrl) {
    throw new Error("DB_URL is not configured");
  }

  const primary = env.dbUrl;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(primary, opts).catch((err) => {
      console.warn("Primary DB connection failed, attempting fallback...", err.message);
      if (env.dbUrlFallback) {
        return mongoose.connect(env.dbUrlFallback, opts);
      }
      throw err;
    }).then((mongoose) => {
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
