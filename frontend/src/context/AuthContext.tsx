import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import axiosClient from "@/services/http/axios";
import { AUTH_EVENTS } from "@/services/auth/authEvents";
import { clearAuthStorage, setAccessToken } from "@/services/auth/tokenStorage";
import { auth, provider } from "@/lib/firebase";
import { notify } from "@/services/toast";

export type AppUser = {
  _id: string;
  email?: string;
  name?: string;
  image?: string;
  bannerUrl?: string;
  role?: string;
  token?: string;
  channelname?: string;
  description?: string;
};

type AuthContextValue = {
  user: AppUser | null;
  ready: boolean;
  login: (userdata: AppUser & { token?: string }) => void;
  updateUser: (patch: Partial<AppUser>) => void;
  logout: () => Promise<void>;
  handlegooglesignin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  const login = (userdata: AppUser & { token?: string }) => {
    setUser(userdata);
    if (typeof window === "undefined") return;

    window.localStorage.setItem("user", JSON.stringify(userdata));
    if (userdata?.token) {
      setAccessToken(String(userdata.token));
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
    // `onAuthStateChanged` will fire after a successful sign-in and will
    // create/refresh the backend session exactly once.
    if (!auth) {
      notify.error(
        "Firebase auth is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars and redeploy."
      );
      return;
    }
    await signInWithPopup(auth, provider);
  };

  useEffect(() => {
    // 1) Restore local session first
    try {
      const saved = window.localStorage.getItem("user");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    setReady(true);

    // 2) Keep React state in sync with global auth logout events
    const onLogout = () => {
      setUser(null);
      clearAuthStorage();
    };

    window.addEventListener(AUTH_EVENTS.logout, onLogout as EventListener);

    // 3) Firebase auth listener for social sign-in (keeps session fresh)
    if (!auth) {
      return () => {
        window.removeEventListener(AUTH_EVENTS.logout, onLogout as EventListener);
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      try {
        if (!firebaseuser) return;
        const payload = {
          email: firebaseuser.email,
          name: firebaseuser.displayName,
          image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        };
        const response = await axiosClient.post("/user/login", payload);
        login({ ...response.data.result, token: response.data.token });
      } catch {
        await logout();
      }
    });

    return () => {
      window.removeEventListener(AUTH_EVENTS.logout, onLogout as EventListener);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, login, updateUser, logout, handlegooglesignin }),
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
