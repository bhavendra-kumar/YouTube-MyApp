import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";

import { dispatchAuthLogout } from "@/services/auth/authEvents";
import {
  clearAuthStorage,
  getAccessToken,
  setAccessToken,
} from "@/services/auth/tokenStorage";
import { notify } from "@/services/toast";

type AxiosConfigWithFlags = AxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? "https://youtube-myapp.onrender.com"
    : "http://localhost:5000";

const baseURL = (process.env.NEXT_PUBLIC_API_URL || "").trim() || DEFAULT_BACKEND_URL;

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(client: AxiosInstance): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await client.post("/user/refresh", undefined, {
        skipAuthRefresh: true,
      } as AxiosConfigWithFlags);

      const token = res.data?.token;
      if (typeof token === "string" && token.length > 0) {
        setAccessToken(token);
        return token;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function createAxiosClient(): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    try {
      if (typeof window === "undefined") return config;

      const token = getAccessToken();
      if (token) {
        config.headers = config.headers ?? {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
    return config;
  });

  // Unwrap backend envelope: { success, data }
  client.interceptors.response.use(
    (response) => {
      const body = response?.data;
      if (
        body &&
        typeof body === "object" &&
        Object.prototype.hasOwnProperty.call(body, "success") &&
        Object.prototype.hasOwnProperty.call(body, "data") &&
        Object.keys(body).length === 2
      ) {
        response.data = body.data;
      }
      return response;
    },
    async (error: AxiosError) => {
      const status = error?.response?.status;
      const config = (error?.config || {}) as AxiosConfigWithFlags;

      const url = String(config?.url || "");
      const isAuthRoute = url.includes("/user/login") || url.includes("/user/refresh") || url.includes("/user/logout") || url.includes("/user/register");

      if (status !== 401 || config.skipAuthRefresh || config._retry || isAuthRoute) {
        return Promise.reject(error);
      }

      if (typeof window === "undefined") {
        return Promise.reject(error);
      }

      config._retry = true;

      const newToken = await refreshAccessToken(client);
      if (newToken) {
        config.headers = config.headers ?? {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config.headers as any).Authorization = `Bearer ${newToken}`;
        return client(config);
      }

      // Refresh failed → hard logout
      clearAuthStorage();
      dispatchAuthLogout("unauthorized");
      notify.info("Session expired. Please sign in again.");

      try {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      } catch {
        // ignore
      }

      return Promise.reject(error);
    }
  );

  return client;
}

const axiosClient = createAxiosClient();
export default axiosClient;
