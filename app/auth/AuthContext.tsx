"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
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

const getLocalToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sfc_token");
};

const setLocalToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  if (!token) window.localStorage.removeItem("sfc_token");
  else window.localStorage.setItem("sfc_token", token);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const isOnSecurity = useMemo(() => {
    return (pathname ?? "").startsWith("/perfil/seguranca");
  }, [pathname]);

  const goToCorrectPlace = useCallback(
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
    const token = getLocalToken();

    // ✅ tenta Authorization se existir token no localStorage
    // ✅ se não existir, /api/auth/me ainda pode ler cookie httpOnly
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch("/api/auth/me", {
      headers,
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));

      // atualiza user
      setUser(data.user ?? null);

      // se backend retornou token renovado, mantém localStorage alinhado (opcional)
      if (data.token) setLocalToken(String(data.token));

      // garante gate
      goToCorrectPlace(data.user ?? null);
      return;
    }

    // token/cookie inválido
    setLocalToken(null);
    setUser(null);
  }, [goToCorrectPlace]);

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  useEffect(() => {
    if (!loading) goToCorrectPlace(user);
  }, [user, loading, goToCorrectPlace]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Login failed");
      }

      const data = await response.json();

      // cookie httpOnly já foi setado no login ✅
      // mantém token no localStorage pra suas rotas que usam Authorization
      if (data?.token) setLocalToken(String(data.token));

      // seta user imediatamente (sidebar para de mostrar "Usuário" na hora)
      setUser(data.user);

      // ✅ força revalidação do app após set-cookie
      router.refresh();

      // gate
      if (data.user?.mustChangePassword) router.replace("/perfil/seguranca");
      else router.replace("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    } finally {
      setLocalToken(null);
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
