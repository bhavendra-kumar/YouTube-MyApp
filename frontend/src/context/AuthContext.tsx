import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

import axiosClient from "@/services/http/axios";
import { AUTH_EVENTS } from "@/services/auth/authEvents";
import {
  clearAuthStorage,
  getAccessToken,
  setAccessToken,
} from "@/services/auth/tokenStorage";
import { auth, provider } from "@/lib/firebase";
import { notify } from "@/services/toast";

export type AppUser = {
  _id: string;
  email?: string;
  name?: string;
  image?: string;
  bannerUrl?: string;
  role?: string;
  isPremium?: boolean;
  plan?: "FREE" | "BRONZE" | "SILVER" | "GOLD" | "PREMIUM";
  planPurchasedAt?: string | null;
  planAmountPaid?: number;
  invoiceId?: string | null;
  downloadsToday?: number;
  dailyDownloadCount?: number;
  lastDownloadDate?: string | null;
  token?: string;
  channelname?: string;
  description?: string;
};

export type SocialProfile = {
  email: string;
  name: string;
  image: string;
};

type AuthContextValue = {
  user: AppUser | null;
  ready: boolean;
  login: (userdata: AppUser & { token?: string }) => void;
  updateUser: (patch: Partial<AppUser>) => void;
  logout: () => Promise<void>;
  handlegooglesignin: () => Promise<void>;
  getGoogleRedirectProfile: () => Promise<SocialProfile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const HAS_REFRESH_SESSION_KEY = "hasRefreshSession";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const refreshAttemptedRef = useRef(false);

  const login = (userdata: AppUser & { token?: string }) => {
    setUser(userdata);
    if (typeof window === "undefined") return;

    window.localStorage.setItem("user", JSON.stringify(userdata));
    if (userdata?.token) {
      setAccessToken(String(userdata.token));
      window.localStorage.setItem(HAS_REFRESH_SESSION_KEY, "1");
    }
  };

  const updateUser = (patch: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("user", JSON.stringify(next));
        } catch {
          // ignore
        }
      }

      return next;
    });
  };

  const logout = async () => {
    setUser(null);
    clearAuthStorage();
    try {
      window.localStorage.removeItem(HAS_REFRESH_SESSION_KEY);
    } catch {
      // ignore
    }

    try {
      // Best-effort backend logout (clears refresh cookie)
      await axiosClient.post("/user/logout", undefined, { skipAuthRefresh: true } as any);
    } catch {
      // ignore
    }

    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {
      // ignore
    }
  };

  const handlegooglesignin = async () => {
    // We intentionally do NOT call the backend here.
    // Backend login is OTP-gated and handled explicitly on the login page.
    if (!auth) {
      notify.error(
        "Firebase auth is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars and redeploy."
      );
      return;
    }
    await signInWithRedirect(auth, provider);
  };

  const getGoogleRedirectProfile = async (): Promise<SocialProfile | null> => {
    if (!auth) return null;

    const cred = await getRedirectResult(auth);
    if (!cred?.user) return null;

    const email = String(cred.user.email || "").trim();
    const name = String(cred.user.displayName || "").trim();
    const image = String(cred.user.photoURL || "").trim();

    return {
      email,
      name,
      image: image || "https://github.com/shadcn.png",
    };
  };

  useEffect(() => {
    // 1) Restore local session (only if we have an access token)
    try {
      const token = getAccessToken();
      const saved = window.localStorage.getItem("user");
      if (saved && token) {
        setUser(JSON.parse(saved));
      } else if (saved && !token) {
        // Stale user object without a token causes redirect loops.
        window.localStorage.removeItem("user");
      }
    } catch {
      // ignore
    }

    setReady(true);

    // 1b) If we don't have an access token, try to refresh using the HttpOnly refresh cookie.
    // This helps after the OTP-gated flow where the token might be cleared but cookie exists.
    (async () => {
      try {
        if (typeof window === "undefined") return;
        if (refreshAttemptedRef.current) return;
        refreshAttemptedRef.current = true;
        if (getAccessToken()) return;

        // Don't spam refresh requests for users who never logged in.
        if (window.localStorage.getItem(HAS_REFRESH_SESSION_KEY) !== "1") return;

        const res = await axiosClient.post(
          "/user/refresh",
          undefined,
          { skipAuthRefresh: true } as any
        );

        const token = res.data?.token;
        const result = res.data?.result;
        if (typeof token === "string" && token.length > 0 && result) {
          login({ ...result, token });
        }
      } catch {
        // ignore
      }
    })();

    // 2) Keep React state in sync with global auth logout events
    const onLogout = () => {
      setUser(null);
      clearAuthStorage();
      try {
        window.localStorage.removeItem(HAS_REFRESH_SESSION_KEY);
      } catch {
        // ignore
      }
    };

    window.addEventListener(AUTH_EVENTS.logout, onLogout as EventListener);

    // 3) Firebase auth listener for social sign-in (keeps session fresh)
    if (!auth) {
      return () => {
        window.removeEventListener(AUTH_EVENTS.logout, onLogout as EventListener);
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      // Backend login is OTP-gated and handled explicitly on the login page.
      // We keep this listener only to avoid stale Firebase sessions.
      if (!firebaseuser) return;
    });

    return () => {
      window.removeEventListener(AUTH_EVENTS.logout, onLogout as EventListener);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, login, updateUser, logout, handlegooglesignin, getGoogleRedirectProfile }),
    [ready, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}


