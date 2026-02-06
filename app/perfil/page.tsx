"use client";

import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound, LogOut, Save } from "lucide-react";

function getLocalToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sfc_token");
}

function initials(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

export default function ProfilePage() {
  const { user, loading, logout, refreshMe } = useAuth();
  const router = useRouter();

  // Perfil
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  async function handleSubmitProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const token = getLocalToken();

      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: user?.id, // compat; ideal é backend ignorar e usar decoded.sub
          name: name.trim(),
          email: email.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao atualizar perfil");
      }

      setSuccess("Perfil atualizado com sucesso!");
      await refreshMe?.();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar perfil");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!currentPassword) return setPwError("Digite sua senha atual.");
    if (newPassword.length < 10)
      return setPwError("A nova senha deve ter pelo menos 10 caracteres.");
    if (newPassword !== confirmNewPassword)
      return setPwError("A confirmação não confere.");

    setPwSubmitting(true);

    try {
      const token = getLocalToken();

      const res = await fetch("/api/usuarios/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao alterar senha");
      }

      setPwSuccess("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPwSuccess(""), 3000);
    } catch (err: any) {
      setPwError(err.message || "Erro ao alterar senha");
    } finally {
      setPwSubmitting(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.name || user.email || "Usuário";
  const roleLabel = user.role === "ADMIN" ? "Administrador" : "Cliente";

  return (
    <section className="p-6 max-w-6xl mx-auto">
      {/* Header (padrão Admin pages) */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Perfil</h1>
          <p className="text-sm text-gray-500">
            Gerencie suas informações e segurança da conta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="
              flex items-center gap-2
              rounded-lg border border-red-300 bg-white px-3 py-2
              text-sm font-semibold text-red-600
              transition-colors hover:bg-red-50
              focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
              cursor-pointer
            "
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>

          {/* botão salvar dispara submit do form de perfil */}
          <button
            type="submit"
            form="profile-form"
            disabled={isSubmitting}
            className="
              flex items-center gap-2
              rounded-lg bg-[#003399] px-3 py-2
              text-sm font-semibold text-white
              transition-colors hover:bg-[#002774]
              disabled:opacity-60
              focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
              cursor-pointer
            "
            title="Salvar alterações"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Alerts gerais (padrão clean, sem “indigo”) */}
      {(error || success) && (
        <div className="mb-6 space-y-2">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}
        </div>
      )}

      {/* Layout: cards (mesma lógica de páginas do dashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Informações */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div
                className="
                  h-11 w-11 shrink-0 overflow-hidden rounded-full
                  border border-[#dfe3f0]
                  bg-linear-to-br from-[#eef2ff] to-white
                  grid place-items-center
                "
              >
                <span className="font-extrabold text-[#003399]">
                  {initials(displayName)}
                </span>
              </div>

              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate" title={displayName}>
                  {displayName}
                </div>
                <div className="text-xs text-gray-500 truncate" title={user.email}>
                  {user.email}
                </div>

                <div className="mt-1">
                  <span
                    className="
                      inline-flex items-center
                      rounded-full bg-[#003399]/10 px-2 py-0.5
                      text-[11px] font-semibold text-[#003399]
                      border border-[#003399]/15
                    "
                  >
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form id="profile-form" onSubmit={handleSubmitProfile} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="
                  w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                  text-slate-900
                  transition-colors
                  hover:border-gray-400
                  focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
                "
              />
              <p className="mt-1 text-xs text-gray-500">
                Esse nome aparece no topo e na sidebar.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="
                  w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5
                  text-gray-500 cursor-not-allowed
                "
              />
              <p className="mt-1 text-xs text-gray-500">
                Email não pode ser alterado.
              </p>
            </div>
          </form>
        </div>

        {/* Card: Segurança */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#003399]/10 border border-[#003399]/15">
                <KeyRound className="h-4 w-4 text-[#003399]" />
              </span>
              <div>
                <div className="font-bold text-slate-900">Segurança</div>
                <div className="text-xs text-gray-500">
                  Troque sua senha (mínimo 10 caracteres).
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Senha atual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="
                  w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                  text-slate-900
                  transition-colors
                  hover:border-gray-400
                  focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
                "
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Nova senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="
                  w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                  text-slate-900
                  transition-colors
                  hover:border-gray-400
                  focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
                "
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Confirmar nova senha
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                className="
                  w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                  text-slate-900
                  transition-colors
                  hover:border-gray-400
                  focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
                "
              />
            </div>

            {(pwError || pwSuccess) && (
              <div className="space-y-2">
                {pwError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {pwSuccess}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={pwSubmitting}
              className="
                w-full rounded-lg bg-[#003399] px-4 py-2.5
                text-sm font-semibold text-white
                transition-colors hover:bg-[#002774]
                disabled:opacity-60
                focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
                cursor-pointer
              "
            >
              {pwSubmitting ? "Alterando..." : "Alterar senha"}
            </button>

            <p className="text-xs text-gray-500">
              Dica: use uma senha longa e única. Evite repetir a senha antiga.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
