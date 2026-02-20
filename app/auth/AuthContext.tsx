"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@prisma/client";

interface User {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LEGACY_LOCAL_TOKEN_KEY = "sfc_token";

function clearLegacyLocalToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_LOCAL_TOKEN_KEY);
  } catch {}
}

function isAuthStatus(status: number) {
  return status === 401 || status === 403;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // evita spam em dev (StrictMode / double effects) e corridas
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const didBoot = useRef(false);
  const didRedirectOnFail = useRef(false);

  const isOnSecurity = useMemo(() => {
    return (pathname ?? "").startsWith("/perfil/seguranca");
  }, [pathname]);

  const enforcePasswordGate = useCallback(
    (u: User | null) => {
      if (!u) return;

      const must = !!u.mustChangePassword;

      if (must && !isOnSecurity) {
        router.replace("/perfil/seguranca");
        return;
      }

      if (!must && isOnSecurity) {
        router.replace("/dashboard");
      }
    },
    [isOnSecurity, router]
  );

  const refreshMe = useCallback(async () => {
    // dedupe: se já tem refresh rodando, reaproveita
    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const nextUser = (data?.user ?? null) as User | null;

          // cookie-first: nunca mais usa token no localStorage
          clearLegacyLocalToken();

          setUser(nextUser);
          didRedirectOnFail.current = false;
          return;
        }

        // Falhou:
        // - 401/403 => sessão inválida (normal)
        // - 404/500 => bug/infra (mas do ponto de vista do app, fica "sem user")
        clearLegacyLocalToken();
        setUser(null);

        // evita loop de redirect em dev
        if (!didRedirectOnFail.current && pathname !== "/login") {
          didRedirectOnFail.current = true;

          // se foi erro de auth, limpa cookie no server (uma vez)
          if (isAuthStatus(res.status)) {
            await fetch("/api/auth/logout", {
              method: "POST",
              cache: "no-store",
              credentials: "same-origin",
            }).catch(() => null);
          }

          router.replace("/login");
          router.refresh();
        }
      } catch {
        // rede/timeout: fail-closed (sem user)
        clearLegacyLocalToken();
        setUser(null);

        if (!didRedirectOnFail.current && pathname !== "/login") {
          didRedirectOnFail.current = true;
          router.replace("/login");
          router.refresh();
        }
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  }, [router, pathname]);

  useEffect(() => {
    // garante boot só uma vez
    if (didBoot.current) return;
    didBoot.current = true;

    (async () => {
      try {
        await refreshMe();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  useEffect(() => {
    if (!loading) enforcePasswordGate(user);
  }, [user, loading, enforcePasswordGate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Login failed");
      }

      const data = await res.json().catch(() => ({}));
      const nextUser = (data?.user ?? null) as User | null;

      clearLegacyLocalToken();
      setUser(nextUser);
      didRedirectOnFail.current = false;

      // garante que server components revalidem após set-cookie
      router.refresh();

      if (nextUser?.mustChangePassword) router.replace("/perfil/seguranca");
      else router.replace("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => null);
    } finally {
      clearLegacyLocalToken();
      setUser(null);

      // fronteira de sessão: navegação dura evita qualquer corrida de cache/hidratação
      if (typeof window !== "undefined") window.location.assign("/login");
      else router.replace("/login");
    }
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
