"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminButton from "@/components/Atoms/AdminButton";
import SuccessDialog from "@/components/Atoms/SuccessDialog";
import ImageUploadButton from "@/components/Atoms/ImageUploadButton";
import PageTitle from "@/components/Atoms/PageTitle";
import {
  COUNTRY_OPTIONS,
  CONTINENT_OPTIONS,
  BR_STATES,
} from "@/lib/dashboard/geoOptions";
import {
  Save,
  ArrowLeft,
  Link as LinkIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";

type ClubFormState = {
  nome: string;
  logoUrl: string;

  countryCode: string;
  countryName: string;
  continentCode: string;

  stateCode: string;
  stateName: string;

  city: string;
};

type LogoMode = "url" | "upload";

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

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function upper(v: string) {
  return (v ?? "").trim().toUpperCase();
}
function clean(v: string) {
  return (v ?? "").trim();
}
function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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

  const [logoMode, setLogoMode] = useState<LogoMode>(
    initial.logoUrl ? "url" : "upload",
  );

  const isBR = useMemo(() => upper(form.countryCode) === "BR", [form.countryCode]);

  const countryPreset = useMemo(() => {
    const cc = upper(form.countryCode);
    return COUNTRY_OPTIONS.find((c) => c.code === cc) ?? null;
  }, [form.countryCode]);

  const pageTitle = mode === "create" ? "Novo clube" : "Editar clube";
  const subtitle =
    mode === "create"
      ? "Cadastre um novo clube e padronize país/estado para o mapa funcionar certo."
      : "Atualize os dados do clube e mantenha país/estado padronizados para o mapa.";

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
    if (!clean(form.countryName)) return "Nome do país é obrigatório.";

    if (!upper(form.continentCode)) return "Selecione um continente.";

    if (cc === "BR") {
      if (!upper(form.stateCode)) return "Para Brasil, selecione um estado (UF).";
      if (!clean(form.stateName)) return "Para Brasil, nome do estado é obrigatório.";
    }

    return null;
  }

  function switchLogoMode(next: LogoMode) {
    if (next === logoMode) return;
    setLogoMode(next);
    set("logoUrl", ""); // exclusividade
  }

  async function onSave() {
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      const cc = upper(form.countryCode);

      // manda string pra não bater no teu Zod atual
      const logoUrlStr = clean(form.logoUrl);

      const payload = {
        nome: clean(form.nome),
        logoUrl: logoUrlStr, // "" ou URL

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
        await api(`/api/clubs/${clubId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMsg("Clube atualizado com sucesso.");
      }
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const hasLogo = !!clean(form.logoUrl);

  const headerActions = (
    <div className="flex gap-2">
      <AdminButton label="Voltar" icon={ArrowLeft} href="/admin/clubes" />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-[#F2CD00] px-4 py-2 font-semibold text-black hover:brightness-95 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );

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
            setForm((prev) => ({
              ...prev,
              nome: "",
              logoUrl: "",
              city: "",
              stateCode: upper(prev.countryCode) === "BR" ? "" : "",
              stateName: upper(prev.countryCode) === "BR" ? "" : "",
            }));
            setLogoMode("upload");
          } else {
            router.refresh();
          }
        }}
      />

      <section className="mx-auto w-full max-w-6xl bg-gray-50 p-6">
        <PageTitle
          base="Admin"
          title={pageTitle}
          subtitle={subtitle}
          actions={headerActions}
          className="mb-6"
          crumbLabel="Clubes"
        />

        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5">
          {/* Dados básicos */}
          <div>
            <div className="mb-3 text-sm font-semibold text-gray-700">Dados do clube</div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome">
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Ex: Flamengo"
                />
              </Field>

              {/* ===== BLOCO LOGO (BONITINHO) ===== */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">Logo</label>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <ImageIcon className="h-4 w-4" />
                        Link ou Upload
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        Escolha apenas 1 método. Ao trocar, o outro é limpo.
                      </div>
                    </div>

                    {/* preview compacto consistente */}
                    <div className="flex-none">
                      <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {hasLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={form.logoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="px-1 text-center text-[10px] leading-tight text-gray-400">
                            sem
                            <br />
                            logo
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* toggle estilo segmented */}
                  <div className="mt-3 inline-flex rounded-xl border border-gray-200 bg-white p-1">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => switchLogoMode("url")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                        logoMode === "url"
                          ? "bg-black text-white"
                          : "text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      <LinkIcon className="h-4 w-4" />
                      Link
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => switchLogoMode("upload")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                        logoMode === "upload"
                          ? "bg-black text-white"
                          : "text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      <UploadIcon className="h-4 w-4" />
                      Upload
                    </button>
                  </div>

                  <div className="mt-3">
                    {logoMode === "url" ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                          value={form.logoUrl}
                          onChange={(e) => set("logoUrl", e.target.value)}
                          placeholder="Cole um link de imagem (https://...)"
                          disabled={saving}
                        />

                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-xs text-gray-500">
                            {hasLogo ? form.logoUrl : "Nenhum link definido"}
                          </div>

                          <button
                            type="button"
                            disabled={saving || !hasLogo}
                            onClick={() => set("logoUrl", "")}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                            title="Limpar logo"
                          >
                            <X className="h-3.5 w-3.5" />
                            Limpar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ImageUploadButton
                        label="Upload do logo"
                        helperText="PNG/JPG — envia para o Cloudinary e salva a URL no clube."
                        valueUrl={form.logoUrl || undefined}
                        disabled={saving}
                        onUploaded={(r) => set("logoUrl", r.secureUrl)}
                        onClear={() => set("logoUrl", "")}
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* ===== /BLOCO LOGO ===== */}
            </div>
          </div>

          {/* Localização */}
          <div className="border-t pt-5">
            <div className="mb-3 text-sm font-semibold text-gray-700">
              Localização (para o mapa)
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="País">
                <select
                  className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={upper(form.countryCode) || ""}
                  onChange={(e) => onPickCountry(e.target.value)}
                  disabled={saving}
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
                <p className="mt-1 text-xs text-gray-500">
                  Use a lista para evitar siglas erradas.
                </p>
              </Field>

              <Field label="Nome do país">
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={form.countryName}
                  onChange={(e) => set("countryName", e.target.value)}
                  placeholder={countryPreset?.name ?? "Ex: Portugal"}
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Evita variações tipo BR/Brasil/BRA.
                </p>
              </Field>

              <Field label="Continente">
                <select
                  className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={upper(form.continentCode) || ""}
                  onChange={(e) => set("continentCode", e.target.value)}
                  disabled={saving}
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
                <p className="mt-1 text-xs text-gray-500">
                  Auto preenche por país, mas você pode ajustar.
                </p>
              </Field>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Cidade (opcional)">
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Ex: Madrid"
                  disabled={saving}
                />
              </Field>

              <Field label="Estado (UF) — só Brasil">
                <select
                  className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 disabled:bg-gray-50"
                  disabled={!isBR || saving}
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
                  <p className="mt-1 text-xs text-gray-500">
                    Fora do BR, estado fica vazio.
                  </p>
                )}
              </Field>

              <Field label="Nome do estado (auto)">
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 disabled:bg-gray-50"
                  disabled={!isBR || saving}
                  value={form.stateName}
                  onChange={(e) => set("stateName", e.target.value)}
                  placeholder={isBR ? "Ex: São Paulo" : "—"}
                />
                <p className="mt-1 text-xs text-gray-500">
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
