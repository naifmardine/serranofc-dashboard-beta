"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Save } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "@/contexts/I18nContext";

function initials(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

export default function ProfilePage() {
  const { user, loading, logout, refreshMe } = useAuth();
  const { t } = useI18n();
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
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          // compat: backend idealmente ignora id e usa decoded.sub
          id: user?.id,
          name: name.trim(),
          email: email.trim(),
        }),
      });

      if (res.status === 401 || res.status === 403) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.profile.falhaAtualizar);
      }

      setSuccess(t.profile.perfilAtualizado);
      await refreshMe?.();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || t.profile.falhaAtualizar);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!currentPassword) return setPwError(t.profile.digiteAtual);
    if (newPassword.length < 10)
      return setPwError(t.profile.senhaMinima);
    if (newPassword !== confirmNewPassword)
      return setPwError(t.profile.confirmaNaoConfere);

    setPwSubmitting(true);

    try {
      const res = await fetch("/api/usuarios/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.profile.falhaSenha);
      }

      setPwSuccess(t.profile.senhaAlterada);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPwSuccess(""), 3000);

      await refreshMe?.();
    } catch (err: any) {
      setPwError(err.message || t.profile.falhaSenha);
    } finally {
      setPwSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">{t.common.carregando}</div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.name || user.email || t.profile.usuario;
  const roleLabel = user.role === "ADMIN" ? t.profile.administrador : t.profile.cliente;

  const headerActions = (
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
        title={t.profile.sair}
      >
        <LogOut className="h-4 w-4" />
        {t.profile.sair}
      </button>

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
        title={t.profile.salvar}
      >
        <Save className="h-4 w-4" />
        {isSubmitting ? t.profile.salvando : t.profile.salvar}
      </button>
    </div>
  );

  return (
    <section className="mx-auto max-w-6xl p-6">
      <PageTitle
        base={t.common.principal}
        title={t.profile.title}
        subtitle={t.profile.subtitle}
        actions={headerActions}
        className="mb-6"
      />

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div
                className="
                  grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full
                  border border-[#dfe3f0]
                  bg-linear-to-br from-[#eef2ff] to-white
                "
              >
                <span className="font-extrabold text-[#003399]">
                  {initials(displayName)}
                </span>
              </div>

              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900" title={displayName}>
                  {displayName}
                </div>
                <div className="truncate text-xs text-gray-500" title={user.email}>
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

          <form id="profile-form" onSubmit={handleSubmitProfile} className="space-y-4 p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                {t.profile.nome}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.profile.nomeCompletoPlaceholder}
                className="
                  w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                  text-slate-900
                  transition-colors
                  hover:border-gray-400
                  focus-visible:outline focus-visible:outline-[#F2CD00] focus-visible:-outline-offset-2
                "
              />
              <p className="mt-1 text-xs text-gray-500">
                {t.profile.nomeHint}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                {t.profile.email}
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
              <p className="mt-1 text-xs text-gray-500">{t.profile.emailHint}</p>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#003399]/10 border border-[#003399]/15">
                <KeyRound className="h-4 w-4 text-[#003399]" />
              </span>
              <div>
                <div className="font-bold text-slate-900">{t.profile.seguranca}</div>
                <div className="text-xs text-gray-500">
                  {t.profile.segurancaDesc}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                {t.profile.senhaAtual}
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
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                {t.profile.novaSenha}
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
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                {t.profile.confirmarSenha}
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
              {pwSubmitting ? t.profile.alterando : t.profile.alterarSenha}
            </button>

            <p className="text-xs text-gray-500">
              {t.profile.dicaSenha}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
