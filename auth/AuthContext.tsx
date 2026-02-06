"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  logout: () => Promise<void> | void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getLocalToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sfc_token");
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const isOnSecurity = useMemo(() => {
    return (pathname ?? "").startsWith("/perfil/seguranca");
  }, [pathname]);

  const goToCorrectPlace = (u: User | null) => {
    if (!u) return;

    const must = !!u.mustChangePassword;

    if (must && !isOnSecurity) {
      router.replace("/perfil/seguranca");
      return;
    }

    if (!must && isOnSecurity) {
      router.replace("/dashboard");
    }
  };

  const refreshMe = async () => {
    const token = getLocalToken();
    if (!token) {
      setUser(null);
      return;
    }

    const response = await fetch("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();

      setUser(data.user ?? null);

      // Se o backend renovou token, mantém localStorage atualizado.
      // OBS: /api/auth/me já seta o cookie httpOnly internamente.
      if (data.token && typeof window !== "undefined") {
        window.localStorage.setItem("sfc_token", data.token);
      }

      goToCorrectPlace(data.user ?? null);
      return;
    }

    // token inválido
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("sfc_token");
    }
    setUser(null);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await refreshMe();
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se o user mudar ou a rota mudar, reforça o gate
  useEffect(() => {
    if (!loading) goToCorrectPlace(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname]);

  const login = async (email: string, password: string) => {
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

    if (typeof window !== "undefined") {
      window.localStorage.setItem("sfc_token", data.token);
    }

    // IMPORTANTE:
    // /api/auth/login já seta o cookie httpOnly (sfc_token).
    // Então não precisamos de /sync-token.

    setUser(data.user);

    if (data.user?.mustChangePassword) {
      router.replace("/perfil/seguranca");
    } else {
      router.replace("/dashboard");
    }
  };

  const logout = async () => {
    // Mantém feature atual: limpa estado client e redireciona.
    // OBS: cookie httpOnly pode continuar existindo no browser
    // (se você usa middleware com cookie, o "logout real" ideal é ter /api/auth/logout pra limpar cookie).
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("sfc_token");
    }
    setUser(null);
    router.replace("/login");
  };

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
