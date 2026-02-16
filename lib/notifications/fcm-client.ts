// ============================================================
// BookFlow Staff — Firebase Cloud Messaging (FCM) client
// Request permission, get token, register with backend.
// ============================================================

const FCM_TOKEN_KEY = "bookflow_fcm_token";
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || "";

export function isFcmSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export async function getFcmToken(): Promise<string | null> {
  if (!isFcmSupported() || !VAPID_KEY) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const key = sub.getKey("p256dh");
      if (!key) return sub.endpoint;
      return btoa(String.fromCharCode(...new Uint8Array(key))).slice(0, 22) + sub.endpoint.slice(-20);
    }
    const newSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
    });
    const token = newSub.endpoint;
    return token;
  } catch (e) {
    console.warn("[FCM] getFcmToken failed", e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function getStoredFcmToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FCM_TOKEN_KEY);
}

export function setStoredFcmToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(FCM_TOKEN_KEY, token);
  else localStorage.removeItem(FCM_TOKEN_KEY);
}

export async function registerForPush(getAuthToken: () => string | null): Promise<boolean> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return false;
  const token = await getFcmToken();
  if (!token) return false;
  setStoredFcmToken(token);
  const auth = getAuthToken();
  if (auth) {
    try {
      await fetch("/api/staff/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
        body: JSON.stringify({ token }),
      });
    } catch (_) {}
  }
  return true;
}
