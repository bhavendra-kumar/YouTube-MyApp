import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

/**
 * Firebase config MUST be environment-based in Next.js.
 *
 * Production note for Google sign-in (signInWithPopup):
 * If you see `FirebaseError: auth/unauthorized-domain`, you need to add your deployed
 * Vercel domains in Firebase Console → Authentication → Settings → Authorized domains.
 *
 * Include at least:
 * - youtube-myapp.vercel.app
 * - every Vercel Preview Deployment domain you use
 */
const requiredFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Measurement ID is optional; only needed if you enable Firebase Analytics.
const measurementId = (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "").trim();

const firebaseConfig = {
  ...requiredFirebaseConfig,
  ...(measurementId ? { measurementId } : {}),
};

const hasFirebaseConfig = Object.values(requiredFirebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
export const auth: Auth | null = hasFirebaseConfig
  ? (() => {
      app = initializeApp(firebaseConfig as Record<string, string>);
      return getAuth(app);
    })()
  : null;

export const provider = new GoogleAuthProvider();

/**
 * Optional Firebase Analytics (client-only).
 *
 * Usage:
 *   const analytics = await getFirebaseAnalytics();
 *
 * Requires NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID to be set.
 */
export async function getFirebaseAnalytics() {
  if (typeof window === "undefined") return null;
  if (!hasFirebaseConfig || !app) return null;
  if (!measurementId) return null;

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch {
    return null;
  }
}

if (typeof window !== "undefined" && !hasFirebaseConfig) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing Firebase env vars (NEXT_PUBLIC_FIREBASE_*). Google sign-in will be disabled until configured."
  );
}
