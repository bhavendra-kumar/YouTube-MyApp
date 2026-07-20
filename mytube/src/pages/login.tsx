import { Button } from "@/components/ui/button";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { user, handlegooglesignin, getGoogleRedirectProfile, login } = useUser();
  const [sending, setSending] = useState(false);
  const hasProcessedRedirectRef = useRef(false);

  async function sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  useEffect(() => {
    if (!user?._id) return;
    const next = typeof router.query?.next === "string" ? router.query.next : "/";
    void router.replace(next);
  }, [router, user]);

  const handleGoogleSignIn = async () => {
    try {
      setSending(true);
      sessionStorage.setItem("started_login", "true");
      await handlegooglesignin();
    } catch (err: any) {
      sessionStorage.removeItem("started_login");
      const code = String(err?.code || "");
      if (code === "auth/unauthorized-domain") {
        notify.error(
          "Google sign-in blocked by Firebase: add localhost (3000) to Firebase Auth → Authorized domains."
        );
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        notify.info("Google sign-in was cancelled");
      } else {
        notify.error("Google sign-in failed");
      }
      setSending(false);
    }
  };

  // After redirect returns, consume Firebase redirect result and complete backend login.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) return;
    if (hasProcessedRedirectRef.current) return;

    const started = sessionStorage.getItem("started_login") === "true";
    if (!started) return;
    hasProcessedRedirectRef.current = true;

    (async () => {
      setSending(true);
      try {
        // Firebase redirect result can be temporarily null right after navigation.
        // Retry briefly before telling the user it didn't complete.
        let firebaseProfile = null as any;
        const delays = [0, 300, 800];
        for (const d of delays) {
          if (d) await sleep(d);
          firebaseProfile = await getGoogleRedirectProfile();
          const emailTry = String(firebaseProfile?.email || "").trim();
          if (emailTry) break;
        }

        // Clear the flag regardless to avoid loops.
        sessionStorage.removeItem("started_login");

        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[auth] firebase redirect profile", firebaseProfile);
        }

        const email = String(firebaseProfile?.email || "").trim();
        if (!email) {
          notify.info(
            "Google sign-in not completed. Please try again."
          );
          return;
        }

        const payload = {
          email,
          name: String(firebaseProfile?.name || "").trim(),
          image: String(firebaseProfile?.image || "").trim(),
        };

        const response = await axiosClient.post("/auth/login", payload);
        const data = response.data;

        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[auth] /auth/login response", data);
        }

        const token = typeof data?.token === "string" ? data.token : "";
        const backendUser = data?.user || data?.result;
        if (token && backendUser && typeof backendUser === "object") {
          login({ ...backendUser, token });
          const next = typeof router.query?.next === "string" ? router.query.next : "/";
          void router.replace(next);
          return;
        }

        notify.error("Login failed: backend did not return a token");
      } catch (e: any) {
        sessionStorage.removeItem("started_login");
        const code = String(e?.code || "");
        if (code === "auth/unauthorized-domain") {
          notify.error(
            "Google sign-in blocked by Firebase: add localhost (3000) to Firebase Auth → Authorized domains."
          );
        } else if (code === "auth/redirect-cancelled-by-user" || code === "auth/popup-closed-by-user") {
          notify.info("Google sign-in was cancelled");
        } else {
          notify.error(e?.response?.data?.message || e?.message || "Login failed");
        }
      } finally {
        setSending(false);
      }
    })();
  }, [getGoogleRedirectProfile, login, router, user]);

  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-[70vh]">
      <div className="mx-auto w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-2xl space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 28 20" className="h-7 w-10" fill="none">
                <rect width="28" height="20" rx="4" fill="#FF0000" />
                <polygon points="11,5 21,10 11,15" fill="white" />
              </svg>
              <span className="font-bold text-2xl tracking-tight">MyTube</span>
            </div>
            <h1 className="text-xl font-semibold text-center">Sign in</h1>
            <p className="text-sm text-muted-foreground text-center">
              to continue to MyTube
            </p>
          </div>

          <Button
            className="w-full rounded-full h-11 text-sm font-medium gap-3"
            style={{ background: "#ff0000", color: "white" }}
            onClick={handleGoogleSignIn}
            disabled={sending}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {sending ? "Signing in…" : "Continue with Google"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to MyTube&apos;s Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </main>
  );
}
