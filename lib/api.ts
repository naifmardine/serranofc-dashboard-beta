const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""; // vazio = mesma origem

type ApiInit = RequestInit & { auth?: boolean };

export async function apiFetch(path: string, init: ApiInit = {}) {
  const { auth = true, ...rest } = init;

  const headers = new Headers(rest.headers || {});
  if (!headers.has("Content-Type") && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Se você continuar usando token no header, ok
  if (auth && typeof window !== "undefined") {
    const token = window.localStorage.getItem("sfc_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  // ✅ IMPORTANTE: não omitir credentials — usa "same-origin" (envia cookie pro mesmo host)
  const res = await fetch(API_URL + path, {
    ...rest,
    headers,
    credentials: "same-origin",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}
