"use client";

import * as React from "react";
import Link from "next/link";

type FormState = {
  nome: string;
  logoUrl: string;
  countryCode: string;
  countryName: string;
  stateCode: string;
  stateName: string;
  city: string;
  continentCode: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  if (!res.ok) {
    let msg = "Erro inesperado.";
    try {
      const data = await res.json();
      msg = data?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

function normalizeCode(v: string) {
  return v.trim().toUpperCase();
}

export default function ClubFormClient({
  mode,
  clubId,
  initial,
}: {
  mode: "create" | "edit";
  clubId?: string;
  initial: FormState;
}) {
  const [form, setForm] = React.useState<FormState>(initial);
  const [saving, setSaving] = React.useState(false);

  const isBR = normalizeCode(form.countryCode) === "BR";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (form.nome.trim().length < 2) return "Nome muito curto.";
    const cc = normalizeCode(form.countryCode);
    if (!cc) return "countryCode é obrigatório (ex: BR, PT, HR).";
    if (!form.countryName.trim()) return "countryName é obrigatório (ex: Brasil).";

    if (isBR) {
      if (!normalizeCode(form.stateCode)) return "Para BR, stateCode é obrigatório (UF: SP, RJ...).";
      if (!form.stateName.trim()) return "Para BR, stateName é obrigatório (ex: São Paulo).";
      if (!normalizeCode(form.continentCode)) return "Para BR, continentCode é obrigatório (sugestão: SA).";
    } else {
      // Fora do BR: zera estado para evitar lixo no banco
      // (a gente também aplica isso no submit)
    }

    return null;
  }

  async function onSubmit() {
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        logoUrl: form.logoUrl.trim() || null,
        countryCode: normalizeCode(form.countryCode),
        countryName: form.countryName.trim(),
        city: form.city.trim() || null,
        continentCode: normalizeCode(form.continentCode) || null,
        stateCode: isBR ? normalizeCode(form.stateCode) : null,
        stateName: isBR ? form.stateName.trim() : null,
      };

      if (mode === "create") {
        await api("/api/clubs", { method: "POST", body: JSON.stringify(payload) });
        window.location.href = "/admin/clubes";
      } else {
        await api(`/api/clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(payload) });
        alert("Salvo.");
      }
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? "Novo clube" : "Editar clube"}
          </h1>
          <p className="text-sm text-gray-500">
            Padronize país/estado para o mapa funcionar sem dor.
          </p>
        </div>

        <Link href="/admin/clubes" className="text-sm underline text-gray-700">
          Voltar
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Nome</label>
            <input className="border rounded-md px-3 py-2" value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Logo URL</label>
            <input className="border rounded-md px-3 py-2" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">countryCode (ISO-2)</label>
            <input
              className="border rounded-md px-3 py-2"
              value={form.countryCode}
              onChange={(e) => set("countryCode", e.target.value)}
              placeholder="BR / PT / HR"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">countryName</label>
            <input
              className="border rounded-md px-3 py-2"
              value={form.countryName}
              onChange={(e) => set("countryName", e.target.value)}
              placeholder="Brasil / Portugal / Croácia"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">continentCode</label>
            <input
              className="border rounded-md px-3 py-2"
              value={form.continentCode}
              onChange={(e) => set("continentCode", e.target.value)}
              placeholder="SA / EU / NA / AF / AS / OC"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Cidade (opcional)</label>
            <input
              className="border rounded-md px-3 py-2"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Rio de Janeiro"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Estado (apenas Brasil)</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">stateCode (UF)</label>
              <input
                className="border rounded-md px-3 py-2"
                value={form.stateCode}
                onChange={(e) => set("stateCode", e.target.value)}
                placeholder="SP / RJ / MG"
                disabled={!isBR}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">stateName</label>
              <input
                className="border rounded-md px-3 py-2"
                value={form.stateName}
                onChange={(e) => set("stateName", e.target.value)}
                placeholder="São Paulo"
                disabled={!isBR}
              />
            </div>
          </div>

          {!isBR && (
            <p className="text-xs text-gray-500 mt-2">
              Fora do BR, estado fica vazio (por design).
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onSubmit}
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded-md"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
