"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

function getLocalToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sfc_token");
}

export default function PerfilSegurancaPage() {
  const { user, loading, refreshMe } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const validation = useMemo(() => {
    if (!newPassword) return { ok: false, msg: null as string | null };
    if (newPassword.length < 10) return { ok: false, msg: "Use pelo menos 10 caracteres." };
    if (newPassword !== confirmNewPassword)
      return { ok: false, msg: "A confirmação não está igual à nova senha." };
    if (currentPassword && newPassword === currentPassword)
      return { ok: false, msg: "A nova senha precisa ser diferente da atual." };
    return { ok: true, msg: null };
  }, [newPassword, confirmNewPassword, currentPassword]);

  // Caso não esteja logado (e já terminou loading), manda pro login
  if (!loading && !user) {
    router.replace("/login");
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!validation.ok) {
      setErr(validation.msg || "Verifique os campos.");
      return;
    }

    const token = getLocalToken();
    if (!token) {
      setErr("Sessão expirada. Faça login novamente.");
      router.replace("/login");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/usuarios/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      setOk("Senha atualizada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Atualiza user e libera o gate
      if (refreshMe) await refreshMe();

      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao atualizar senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl border border-gray-200 bg-white grid place-items-center">
          <Lock className="w-4 h-4 text-gray-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Segurança</h1>
          <p className="text-sm text-gray-600">
            {user?.mustChangePassword
              ? "Para continuar, você precisa trocar a senha temporária."
              : "Atualize sua senha quando quiser."}
          </p>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {ok}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-800">Trocar senha</h2>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Senha atual</label>
            <div className="relative">
              <input
                type={showCurr ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowCurr((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                disabled={submitting}
                title={showCurr ? "Ocultar" : "Mostrar"}
              >
                {showCurr ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Nova senha</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={10}
                disabled={submitting}
                className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                placeholder="Mínimo 10 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                disabled={submitting}
                title={showNew ? "Ocultar" : "Mostrar"}
              >
                {showNew ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Dica: use uma senha longa com letras, números e símbolos.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Confirmar nova senha</label>
            <div className="relative">
              <input
                type={showConf ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={10}
                disabled={submitting}
                className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowConf((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                disabled={submitting}
                title={showConf ? "Ocultar" : "Mostrar"}
              >
                {showConf ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
              </button>
            </div>
          </div>

          {validation.msg && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {validation.msg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {!user?.mustChangePassword && (
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                disabled={submitting}
              >
                Voltar
              </button>
            )}

            <button
              type="submit"
              disabled={!validation.ok || submitting}
              className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
