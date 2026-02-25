import { createClient } from "redis";

import { env } from "../config/env.js";

let client = null;
let connectPromise = null;

function getRedisUrl() {
  return env?.redis?.url || process.env.REDIS_URL || "";
}

async function getClient() {
  const url = getRedisUrl();
  if (!url) return null;

  if (client) return client;

  client = createClient({
    url,
    socket: {
      connectTimeout: 1000,
    },
  });
  client.on("error", () => {
    // Don't crash the app for cache issues.
  });

  if (!connectPromise) {
    connectPromise = client.connect().catch(() => {
      try {
        client?.quit();
      } catch {
        // ignore
      }
      client = null;
      connectPromise = null;
      return null;
    });
  }

  const connected = await connectPromise;
  if (!connected && !client) return null;
  return client;
}

export async function cacheGetJson(key) {
  const c = await getClient();
  if (!c) return null;

  try {
    const raw = await c.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function cacheSetJson(key, value, ttlSeconds) {
  const c = await getClient();
  if (!c) return false;

  const ttl = Number(ttlSeconds);
  const safeTtl = Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 60;

  try {
    const payload = JSON.stringify(value);
    await c.setEx(key, safeTtl, payload);
    return true;
  } catch {
    return false;
  }
}
