export const AUTH_EVENTS = {
  logout: "auth:logout",
} as const;

export type AuthEventName = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

export function dispatchAuthLogout(reason?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_EVENTS.logout, {
      detail: { reason: reason || "unauthorized" },
    })
  );
}
