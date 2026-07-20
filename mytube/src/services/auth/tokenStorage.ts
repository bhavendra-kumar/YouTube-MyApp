const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const directToken = window.localStorage.getItem(TOKEN_KEY);
  if (directToken) return directToken;

  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser);
    const token = parsed?.token;
    return token ? String(token) : null;
  } catch {
    return null;
  }
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, String(token));

  // Best-effort: also keep `user.token` in sync
  try {
    const rawUser = window.localStorage.getItem(USER_KEY);
    if (!rawUser) return;
    const parsed = JSON.parse(rawUser);
    const next = { ...parsed, token: String(token) };
    window.localStorage.setItem(USER_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}
