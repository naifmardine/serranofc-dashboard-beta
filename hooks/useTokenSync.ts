import { useEffect } from "react";

/**
 * Sincroniza o token do localStorage para o cookie httpOnly
 * SEM precisar de /api/auth/sync-token.
 *
 * Como?
 * - chama /api/auth/me com Authorization Bearer
 * - o próprio /me renova e seta o cookie httpOnly (sfc_token)
 */
export function useTokenSync() {
  useEffect(() => {
    const token =
      typeof window === "undefined" ? null : window.localStorage.getItem("sfc_token");

    if (!token) return;

    // Dispara uma chamada “best effort” só pra garantir cookie httpOnly atualizado.
    // Silencia erros, igual antes.
    fetch("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => {});
  }, []);
}
