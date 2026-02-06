"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const next = searchParams.get("next") || "/dashboard";
      router.replace(next);
    }
  }, [user, loading, router, searchParams]);

  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
    return () => {
      document.documentElement.classList.remove("no-scroll");
      document.body.classList.remove("no-scroll");
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      await login(email, password);

      // o AuthContext já redireciona pro lugar certo (dashboard ou seguranca)
      // se você quiser respeitar ?next, dá pra ajustar depois — mas primeiro estabiliza.
    } catch (err: any) {
      setError(err?.message || "Erro ao fazer login");
      setIsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-dvh grid place-items-center bg-[#0b1739]">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh grid place-items-center bg-[#0b1739] isolate overflow-hidden">
      <div
        className="absolute inset-[-3px] bg-no-repeat bg-cover z-0 pointer-events-none"
        style={{
          backgroundImage: "url(/assets/background.svg)",
          backgroundPosition: "50% 50%",
        }}
      />

      <form
        className="relative z-10 w-[92%] max-w-[520px] bg-white rounded-[18px] shadow-[0_10px_30px_rgba(0,0,0,0.2)] p-7 pb-6"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-center mb-2">
          <img
            className="h-[140px]"
            src="/assets/logo-serrano.svg"
            alt="Serrano Football Club"
          />
        </div>

        <h1 className="text-center text-xl font-semibold mb-[18px]">
          Serrano Football Club
        </h1>

        <label className="block mb-3.5">
          <span className="block text-xs text-gray-700 mb-1.5">Email</span>
          <input
            className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 outline-none 
                       focus:border-indigo-300 focus:ring-[3px] focus:ring-indigo-500/20"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="block mb-3.5">
          <span className="block text-xs text-gray-700 mb-1.5">Senha</span>
          <input
            className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 outline-none
                       focus:border-indigo-300 focus:ring-[3px] focus:ring-indigo-500/20"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div className="text-red-600 text-xs -mt-1.5 mb-2.5">{error}</div>
        )}

        <button
          className="w-full border-none rounded-xl px-3 py-2.5 bg-[#5b6cff] text-white font-semibold cursor-pointer
                     disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Entrando..." : "Log in"}
        </button>

        <p className="mt-4 text-center text-xs text-gray-600">
          Ao continuar, você concorda com os Termos e a Política de Privacidade.
        </p>
      </form>
    </div>
  );
}
