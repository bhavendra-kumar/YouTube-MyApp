import mongoose from "mongoose";
import { env } from "./env.js";

function isSrvLookupFailure(err) {
  const msg = String(err?.message || "");
  return (
    msg.includes("querySrv") ||
    msg.includes("_mongodb._tcp") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ECONNREFUSED")
  );
}

function redactMongoUri(uri) {
  const raw = String(uri || "");
  if (!raw) return "";
  try {
    // mongodb+srv://user:pass@host/db -> show protocol + host only
    const withoutProto = raw.replace(/^mongodb\+srv:\/\//i, "").replace(/^mongodb:\/\//i, "");
    const atIndex = withoutProto.lastIndexOf("@");
    const hostAndAfter = atIndex >= 0 ? withoutProto.slice(atIndex + 1) : withoutProto;
    const hostOnly = hostAndAfter.split("/")[0];
    const proto = /^mongodb\+srv:\/\//i.test(raw) ? "mongodb+srv://" : "mongodb://";
    return `${proto}${hostOnly}`;
  } catch {
    return "mongodb://<redacted>";
  }
}

export async function connectDb() {
  if (!env.dbUrl) {
    throw new Error("DB_URL is not configured");
  }

  const primary = env.dbUrl;
  const fallback = process.env.DB_URL_FALLBACK;

  try {
    await mongoose.connect(primary);
    return mongoose.connection;
  } catch (err) {
    const allowFallback = env.nodeEnv !== "production" && Boolean(fallback);
    if (allowFallback && isSrvLookupFailure(err)) {
      // eslint-disable-next-line no-console
      console.warn(
        [
          "[db] Primary DB_URL failed (likely DNS/SRV lookup issue).",
          `      primary: ${redactMongoUri(primary)}`,
          "[db] Retrying with DB_URL_FALLBACK...",
        ].join("\n")
      );
      await mongoose.connect(String(fallback));
      return mongoose.connection;
    }

    const hint =
      primary.startsWith("mongodb+srv://") && isSrvLookupFailure(err)
        ? [
            "MongoDB connection failed while resolving Atlas SRV records.",
            "This is usually caused by blocked/broken DNS (VPN, corporate network, offline, or firewall).",
            "Fix options:",
            "- Ensure you have internet/DNS access and try again",
            "- Or set DB_URL to a non-SRV mongodb:// URI",
            "- Or set DB_URL_FALLBACK to a local MongoDB (e.g. mongodb://127.0.0.1:27017/youtube)",
          ].join("\n")
        : "";

    const wrapped = new Error(
      [
        `Could not connect to MongoDB (${redactMongoUri(primary)})`,
        hint,
        String(err?.message || err),
      ]
        .filter(Boolean)
        .join("\n")
    );
    wrapped.cause = err;
    throw wrapped;
  }
}
