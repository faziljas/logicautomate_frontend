// Client-side staff API helpers (uses token from localStorage / context)
const STAFF_TOKEN_KEY = "bookflow_staff_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STAFF_TOKEN_KEY);
}

export async function staffFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}

export async function staffJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await staffFetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}
