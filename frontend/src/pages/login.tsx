import { Button } from "@/components/ui/button";
import { useUser } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import axiosClient from "@/services/http/axios";
import { notify } from "@/services/toast";

// South Indian states to detect
const SOUTH_INDIA_STATES = [
  "tamil nadu", "kerala", "karnataka", "andhra pradesh", "telangana",
  "pondicherry", "puducherry",
];

function isSouthIndian(state: string) {
  const s = String(state || "").toLowerCase();
  return SOUTH_INDIA_STATES.some((name) => s.includes(name));
}

/** Returns true if current IST time is between 10:00 and 12:00 */
function isInMorningWindow() {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // UTC+5:30
  const hours = nowIST.getUTCHours();
  return hours >= 10 && hours < 12;
}

async function detectUserState(): Promise<{ state: string; isSouth: boolean }> {
  try {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { state: "", isSouth: false };
    }
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
    );
    const { latitude, longitude } = pos.coords;
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    const data = await res.json();
    const state = String(data?.principalSubdivision || data?.city || "");
    return { state, isSouth: isSouthIndian(state) };
  } catch {
    return { state: "", isSouth: false };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, handlegooglesignin, getGoogleRedirectProfile, login } = useUser();
  const { setTheme } = useTheme();

  const [geoChecked, setGeoChecked] = useState(false);
  const [detectedState, setDetectedState] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("sms");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const hasAppliedThemeRef = useRef(false);

  const hasProcessedRedirectRef = useRef(false);

  // Apply geo + time based theme on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGeoLoading(true);
      const { state, isSouth } = await detectUserState();
      if (cancelled) return;
      setDetectedState(state);

      const morning = isInMorningWindow();
      const useLightTheme = isSouth && morning;
      setChannel(useLightTheme ? "email" : "sms");

      if (!hasAppliedThemeRef.current) {
        setTheme(useLightTheme ? "light" : "dark");
        hasAppliedThemeRef.current = true;
      }

      setGeoChecked(true);
      setGeoLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    const next = typeof router.query?.next === "string" ? router.query.next : "/";
    void router.replace(next);
  }, [router, user]);

  const handleGoogleSignIn = async () => {
    try {
      setSending(true);
      sessionStorage.setItem("started_login", "true");
      await handlegooglesignin();
    } catch {
      sessionStorage.removeItem("started_login");
      notify.error("Google sign-in failed");
      setSending(false);
    }
  };

  // After redirect returns, consume Firebase redirect result and continue backend OTP flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!geoChecked) return;
    if (user) return;
    if (hasProcessedRedirectRef.current) return;

    const started = sessionStorage.getItem("started_login") === "true";
    if (!started) return;
    hasProcessedRedirectRef.current = true;

    (async () => {
      setSending(true);
      try {
        const firebaseProfile = await getGoogleRedirectProfile();
        // Clear the flag regardless to avoid loops if the user cancelled.
        sessionStorage.removeItem("started_login");

        const email = String(firebaseProfile?.email || "").trim();
        if (!email) {
          notify.info("Google sign-in was cancelled");
          return;
        }

        const payload = {
          email,
          name: String(firebaseProfile?.name || "").trim(),
          image: String(firebaseProfile?.image || "").trim(),
        };

        const response = await axiosClient.post("/user/login", payload);
        const data = response.data;

        if (typeof data?.token === "string" && data.token.length > 0) {
          login({ ...data.result, token: data.token });
          const next = typeof router.query?.next === "string" ? router.query.next : "/";
          void router.replace(next);
          return;
        }

        const userId = String(data?.userId || data?.result?._id || "");
        if (!userId) {
          notify.error("Login failed: missing user id");
          return;
        }

        await requestOtp(userId, false);
      } catch (e: any) {
        sessionStorage.removeItem("started_login");
        notify.error(e?.response?.data?.message || "Login failed");
      } finally {
        setSending(false);
      }
    })();
  }, [geoChecked, getGoogleRedirectProfile, login, requestOtp, router, user]);

  async function requestOtp(userId: string, manageLoading = true) {
    try {
      if (manageLoading) setSending(true);
      setOtpCode("");
      const res = await axiosClient.post("/user/otp/send", {
        userId,
        state: detectedState,
        channel: "email",
      });

      const backendChannel = res?.data?.channel;
      const sent = Boolean(res?.data?.sent);
      const reason = String(res?.data?.reason || "");
      if (backendChannel === "email" || backendChannel === "sms") {
        setChannel(backendChannel);
      }

      setPendingUserId(userId);
      setOtpStep(true);

      if (sent) {
        notify.success(
          `OTP sent via ${backendChannel === "email" ? "email" : "SMS / email"}`
        );
      } else if (reason === "smtp_not_configured") {
        notify.error("OTP email not sent: SMTP is not configured on backend.");
      } else {
        notify.error("OTP could not be delivered. Try again.");
      }
    } catch (e: any) {
      notify.error(e?.response?.data?.message || "Failed to send OTP");
    } finally {
      if (manageLoading) setSending(false);
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || !pendingUserId) return;
    try {
      setVerifying(true);
      const res = await axiosClient.post("/user/otp/verify", {
        userId: pendingUserId,
        code: otpCode.trim(),
      });

      const token = res.data?.token;
      const result = res.data?.result;
      if (typeof token === "string" && token.length > 0 && result && typeof result === "object") {
        login({ ...result, token });
      } else {
        notify.error("Verification succeeded but backend did not return a token");
        return;
      }

      setOtpStep(false);
      notify.success("✅ Verified! Logging you in…");
      const next = typeof router.query?.next === "string" ? router.query.next : "/";
      router.push(next);
    } catch (e: any) {
      notify.error(e?.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-[70vh]">
      <div className="mx-auto w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-xl space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-3xl font-extrabold tracking-tight">▶ YouTube</span>
            </div>
            <h1 className="text-xl font-semibold text-center">Sign in to your account</h1>
            {!geoLoading && detectedState && (
              <p className="text-xs text-muted-foreground">
                📍 Detected: <span className="font-medium">{detectedState}</span>
                {" · "}
                {channel === "email" ? "Email OTP flow" : "SMS OTP flow"}
              </p>
            )}
            {geoLoading && (
              <p className="text-xs text-muted-foreground animate-pulse">Detecting your location…</p>
            )}
          </div>

          {!otpStep ? (
            <Button
              className="w-full rounded-xl py-5 text-base font-semibold bg-red-600 hover:bg-red-700 text-white"
              onClick={handleGoogleSignIn}
              disabled={sending || geoLoading}
            >
              {sending ? "Signing in…" : "Continue with Google"}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-4 text-sm text-center">
                <p className="font-medium mb-1">Enter your verification code</p>
                <p className="text-muted-foreground text-xs">
                  {channel === "email" ? "Check your registered email" : "Check your registered mobile number"}{" "}
                  for the 6-digit OTP
                </p>
              </div>

              {/* OTP input boxes */}
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={otpCode[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const arr = otpCode.split("");
                      arr[i] = val;
                      const next = arr.join("").slice(0, 6);
                      setOtpCode(next);
                      if (val && i < 5) {
                        document.getElementById(`otp-${i + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otpCode[i] && i > 0) {
                        document.getElementById(`otp-${i - 1}`)?.focus();
                      }
                    }}
                    className="w-11 h-12 rounded-xl border-2 text-center text-lg font-bold bg-background
                      focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                ))}
              </div>

              <Button
                className="w-full rounded-xl py-5 text-base font-semibold bg-red-600 hover:bg-red-700 text-white"
                onClick={handleVerifyOtp}
                disabled={otpCode.length < 6 || verifying}
              >
                {verifying ? "Verifying…" : "Verify & Sign in"}
              </Button>

              <div className="flex justify-between text-xs text-muted-foreground">
                <button
                  className="underline hover:text-foreground"
                  onClick={() => pendingUserId && requestOtp(pendingUserId)}
                  disabled={sending}
                >
                  Resend OTP
                </button>
                <button
                  className="underline hover:text-foreground"
                  onClick={() => {
                    setOtpStep(false);
                    setOtpCode("");
                    setPendingUserId(null);
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
