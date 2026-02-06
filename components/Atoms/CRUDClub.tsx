"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminButton from "@/components/Atoms/AdminButton";
import SuccessDialog from "@/components/Atoms/SuccessDialog";
import { Save, ArrowLeft } from "lucide-react";

type ClubFormState = {
  nome: string;
  logoUrl: string;

  countryCode: string; // BR, PT, HR...
  countryName: string; // Brasil, Portugal...
  continentCode: string; // SA, EU...

  stateCode: string; // SP, RJ... (apenas BR)
  stateName: string; // São Paulo... (apenas BR)

  city: string;
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

/** Lista curta pro “usuário médio” não errar. Pode expandir depois. */
const COUNTRY_OPTIONS = [
  { code: "BR", name: "Brasil", continent: "SA" },
  { code: "PT", name: "Portugal", continent: "EU" },
  { code: "HR", name: "Croácia", continent: "EU" },
  { code: "ES", name: "Espanha", continent: "EU" },
  { code: "IT", name: "Itália", continent: "EU" },
  { code: "FR", name: "França", continent: "EU" },
  { code: "DE", name: "Alemanha", continent: "EU" },
  { code: "NL", name: "Holanda", continent: "EU" },
  { code: "BE", name: "Bélgica", continent: "EU" },
  { code: "GB", name: "Reino Unido", continent: "EU" },
  { code: "US", name: "Estados Unidos", continent: "NA" },
  { code: "AR", name: "Argentina", continent: "SA" },
  { code: "UY", name: "Uruguai", continent: "SA" },
  { code: "CL", name: "Chile", continent: "SA" },
];

const CONTINENT_OPTIONS = [
  { code: "SA", name: "América do Sul" },
  { code: "NA", name: "América do Norte" },
  { code: "EU", name: "Europa" },
  { code: "AF", name: "África" },
  { code: "AS", name: "Ásia" },
  { code: "OC", name: "Oceania" },
];

/** UF -> nome (o suficiente pra não virar texto livre) */
const BR_STATES: Array<{ code: string; name: string }> = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
];

function upper(v: string) {
  return v.trim().toUpperCase();
}
function clean(v: string) {
  return v.trim();
}

export default function CRUDClub({
  mode,
  clubId,
  initial,
}: {
  mode: "create" | "edit";
  clubId?: string;
  initial: ClubFormState;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ClubFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isBR = useMemo(() => upper(form.countryCode) === "BR", [form.countryCode]);

  const countryPreset = useMemo(() => {
    const cc = upper(form.countryCode);
    return COUNTRY_OPTIONS.find((c) => c.code === cc) ?? null;
  }, [form.countryCode]);

  function set<K extends keyof ClubFormState>(key: K, value: ClubFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onPickCountry(code: string) {
    const cc = upper(code);
    const preset = COUNTRY_OPTIONS.find((c) => c.code === cc);

    setForm((prev) => ({
      ...prev,
      countryCode: cc,
      countryName: preset?.name ?? (cc ? prev.countryName : ""),
      continentCode: preset?.continent ?? prev.continentCode,
      stateCode: cc === "BR" ? prev.stateCode : "",
      stateName: cc === "BR" ? prev.stateName : "",
    }));
  }

  function onPickState(uf: string) {
    const u = upper(uf);
    const st = BR_STATES.find((s) => s.code === u);
    setForm((prev) => ({
      ...prev,
      stateCode: u,
      stateName: st?.name ?? prev.stateName,
    }));
  }

  function validate(): string | null {
    if (clean(form.nome).length < 2) return "Nome muito curto.";

    const cc = upper(form.countryCode);
    if (!cc) return "Selecione um país.";
    if (cc === "__OTHER__") return "Selecione um país válido (ou preencha manualmente corretamente).";
    if (!clean(form.countryName)) return "Nome do país é obrigatório.";

    if (!upper(form.continentCode)) return "Selecione um continente.";

    if (cc === "BR") {
      if (!upper(form.stateCode)) return "Para Brasil, selecione um estado (UF).";
      if (!clean(form.stateName)) return "Para Brasil, nome do estado é obrigatório.";
    }

    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      const cc = upper(form.countryCode);

      const payload = {
        nome: clean(form.nome),
        logoUrl: clean(form.logoUrl) || null,

        countryCode: cc,
        countryName: clean(form.countryName),
        continentCode: upper(form.continentCode),
        city: clean(form.city) || null,

        stateCode: cc === "BR" ? upper(form.stateCode) : null,
        stateName: cc === "BR" ? clean(form.stateName) : null,
      };

      if (mode === "create") {
        await api("/api/clubs", { method: "POST", body: JSON.stringify(payload) });
        setSuccessMsg("Clube cadastrado com sucesso.");
      } else {
        await api(`/api/clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccessMsg("Clube atualizado com sucesso.");
      }
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SuccessDialog
        open={!!successMsg}
        title={mode === "create" ? "Clube cadastrado" : "Clube atualizado"}
        description={successMsg ?? undefined}
        primaryLabel="Voltar para clubes"
        onPrimary={() => {
          setSuccessMsg(null);
          router.push("/admin/clubes");
          router.refresh();
        }}
        secondaryLabel={mode === "create" ? "Cadastrar outro" : "Continuar editando"}
        onSecondary={() => {
          setSuccessMsg(null);
          if (mode === "create") {
            // mantém defaults de localização e limpa o resto
            setForm((prev) => ({
              ...prev,
              nome: "",
              logoUrl: "",
              city: "",
              stateCode: upper(prev.countryCode) === "BR" ? "" : "",
              stateName: upper(prev.countryCode) === "BR" ? "" : "",
            }));
          } else {
            router.refresh();
          }
        }}
      />

      <section className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">
            Admin → Clubes → {mode === "create" ? "Novo" : "Editar"}
          </h1>

          <div className="flex gap-2">
            <AdminButton label="Voltar" icon={ArrowLeft} href="/admin/clubes" />
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold bg-[#F2CD00] text-black hover:brightness-95 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-6">
          {/* Dados básicos */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-3">Dados do clube</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome">
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Ex: Flamengo"
                />
              </Field>

              <Field label="Logo URL (opcional)">
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.logoUrl}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </div>

          {/* Localização */}
          <div className="border-t pt-5">
            <div className="text-sm font-semibold text-gray-700 mb-3">
              Localização (para o mapa)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="País">
                <select
                  className="w-full border rounded-xl px-3 py-2 bg-white"
                  value={upper(form.countryCode) || ""}
                  onChange={(e) => onPickCountry(e.target.value)}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Use a lista para evitar siglas erradas.
                </p>
              </Field>

              <Field label="Nome do país">
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.countryName}
                  onChange={(e) => set("countryName", e.target.value)}
                  placeholder={countryPreset?.name ?? "Ex: Brasil"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Evita variações tipo BR/Brasil/BRA.
                </p>
              </Field>

              <Field label="Continente">
                <select
                  className="w-full border rounded-xl px-3 py-2 bg-white"
                  value={upper(form.continentCode) || ""}
                  onChange={(e) => set("continentCode", e.target.value)}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {CONTINENT_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Auto preenche por país, mas você pode ajustar.
                </p>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Field label="Cidade (opcional)">
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Ex: Rio de Janeiro"
                />
              </Field>

              <Field label="Estado (UF) — só Brasil">
                <select
                  className="w-full border rounded-xl px-3 py-2 bg-white disabled:bg-gray-50"
                  disabled={!isBR}
                  value={upper(form.stateCode) || ""}
                  onChange={(e) => onPickState(e.target.value)}
                >
                  <option value="" disabled>
                    {isBR ? "Selecione..." : "—"}
                  </option>
                  {BR_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                {!isBR && (
                  <p className="text-xs text-gray-500 mt-1">
                    Fora do BR, estado fica vazio.
                  </p>
                )}
              </Field>

              <Field label="Nome do estado (auto)">
                <input
                  className="w-full border rounded-xl px-3 py-2 disabled:bg-gray-50"
                  disabled={!isBR}
                  value={form.stateName}
                  onChange={(e) => set("stateName", e.target.value)}
                  placeholder={isBR ? "Ex: São Paulo" : "—"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Preenche automático pelo select da UF.
                </p>
              </Field>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
