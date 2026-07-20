// @ts-nocheck
import { env } from "@/lib/config/env";

export function getRefreshCookieOptions() {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
}
