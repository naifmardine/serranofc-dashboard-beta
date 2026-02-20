const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""; // vazio = mesma origem

type ApiInit = RequestInit & { auth?: boolean };

/**
 * Cookie-first:
 * - SEM Authorization automático
 * - SEM localStorage
 * - SEM sync-token
 * - usa cookie httpOnly via credentials:"same-origin"
 */
export async function apiFetch(path: string, init: ApiInit = {}) {
  const { auth = true, ...rest } = init;

  const headers = new Headers(rest.headers || {});
  if (!headers.has("Content-Type") && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(API_URL + path, {
    ...rest,
    headers,
    credentials: auth ? "same-origin" : "omit",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }

  return res.text();
}
