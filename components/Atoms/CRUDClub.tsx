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
import { useI18n } from "@/contexts/I18nContext";

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

async function api<T>(url: string, init?: RequestInit, defaultErrMsg?: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  if (!res.ok) {
    let msg = defaultErrMsg ?? "Erro inesperado.";
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
  const { t } = useI18n();
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

  const pageTitle = mode === "create" ? t.crudClub.novoClube : t.crudClub.editarClube;
  const subtitle =
    mode === "create" ? t.crudClub.novoSubtitle : t.crudClub.editarSubtitle;

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
    if (clean(form.nome).length < 2) return t.crudClub.nomemuito;

    const cc = upper(form.countryCode);
    if (!cc) return t.crudClub.selecionePais;
    if (!clean(form.countryName)) return t.crudClub.nomePaisObrigatorio;

    if (!upper(form.continentCode)) return t.crudClub.selecioneContinente;

    if (cc === "BR") {
      if (!upper(form.stateCode)) return t.crudClub.brasilSelecione;
      if (!clean(form.stateName)) return t.crudClub.brasilNomeEstado;
    }

    return null;
  }

  function switchLogoMode(next: LogoMode) {
    if (next === logoMode) return;
    setLogoMode(next);
    set("logoUrl", "");
  }

  async function onSave() {
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      const cc = upper(form.countryCode);

      const logoUrlStr = clean(form.logoUrl);

      const payload = {
        nome: clean(form.nome),
        logoUrl: logoUrlStr,

        countryCode: cc,
        countryName: clean(form.countryName),
        continentCode: upper(form.continentCode),
        city: clean(form.city) || null,

        stateCode: cc === "BR" ? upper(form.stateCode) : null,
        stateName: cc === "BR" ? clean(form.stateName) : null,
      };

      if (mode === "create") {
        await api("/api/clubs", { method: "POST", body: JSON.stringify(payload) }, t.crudClub.erroInesperado);
        setSuccessMsg(t.crudClub.cadastradoSucesso);
      } else {
        await api(`/api/clubs/${clubId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, t.crudClub.erroInesperado);
        setSuccessMsg(t.crudClub.atualizadoSucesso);
      }
    } catch (e: any) {
      alert(e?.message || t.crudClub.erroSalvar);
    } finally {
      setSaving(false);
    }
  }

  const hasLogo = !!clean(form.logoUrl);

  const headerActions = (
    <div className="flex gap-2">
      <AdminButton label={t.crudClub.voltar} icon={ArrowLeft} href="/admin/clubes" />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-[#F2CD00] px-4 py-2 font-semibold text-black hover:brightness-95 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? t.crudClub.salvando : t.crudClub.salvar}
      </button>
    </div>
  );

  return (
    <>
      <SuccessDialog
        open={!!successMsg}
        title={mode === "create" ? t.crudClub.clubeCadastrado : t.crudClub.clubeAtualizado}
        description={successMsg ?? undefined}
        primaryLabel={t.crudClub.voltarClubes}
        onPrimary={() => {
          setSuccessMsg(null);
          router.push("/admin/clubes");
          router.refresh();
        }}
        secondaryLabel={mode === "create" ? t.crudClub.cadastrarOutro : t.crudClub.continuarEditando}
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
          crumbLabel={t.crudClub.clubes}
        />

        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5">
          {/* Dados básicos */}
          <div>
            <div className="mb-3 text-sm font-semibold text-gray-700">{t.crudClub.dadosClube}</div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t.crudClub.nome}>
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Ex: Flamengo"
                />
              </Field>

              {/* ===== BLOCO LOGO ===== */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">{t.crudClub.logo}</label>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <ImageIcon className="h-4 w-4" />
                        {t.crudClub.linkOuUpload}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {t.crudClub.escolhaMetodo}
                      </div>
                    </div>

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
                            {t.crudClub.semLogo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

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
                          placeholder={t.crudClub.coleLink}
                          disabled={saving}
                        />

                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-xs text-gray-500">
                            {hasLogo ? form.logoUrl : t.crudClub.nenhumLink}
                          </div>

                          <button
                            type="button"
                            disabled={saving || !hasLogo}
                            onClick={() => set("logoUrl", "")}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                            title={t.crudClub.limpar}
                          >
                            <X className="h-3.5 w-3.5" />
                            {t.crudClub.limpar}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ImageUploadButton
                        label={t.crudClub.uploadLogo}
                        helperText={t.crudClub.uploadHelper}
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
              {t.crudClub.localizacao}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label={t.crudClub.pais}>
                <select
                  className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={upper(form.countryCode) || ""}
                  onChange={(e) => onPickCountry(e.target.value)}
                  disabled={saving}
                >
                  <option value="" disabled>
                    {t.crudClub.selecione}
                  </option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {t.crudClub.useListaEvitar}
                </p>
              </Field>

              <Field label={t.crudClub.nomePais}>
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={form.countryName}
                  onChange={(e) => set("countryName", e.target.value)}
                  placeholder={countryPreset?.name ?? "Ex: Portugal"}
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t.crudClub.evitaVariacoes}
                </p>
              </Field>

              <Field label={t.crudClub.continente}>
                <select
                  className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={upper(form.continentCode) || ""}
                  onChange={(e) => set("continentCode", e.target.value)}
                  disabled={saving}
                >
                  <option value="" disabled>
                    {t.crudClub.selecione}
                  </option>
                  {CONTINENT_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {t.crudClub.autoPreenchePais}
                </p>
              </Field>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label={t.crudClub.cidadeOpcional}>
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Ex: Madrid"
                  disabled={saving}
                />
              </Field>

              <Field label={t.crudClub.estadoUfBrasil}>
                <select
                  className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 disabled:bg-gray-50"
                  disabled={!isBR || saving}
                  value={upper(form.stateCode) || ""}
                  onChange={(e) => onPickState(e.target.value)}
                >
                  <option value="" disabled>
                    {isBR ? t.crudClub.selecione : "—"}
                  </option>
                  {BR_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                {!isBR && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t.crudClub.foraBrVazio}
                  </p>
                )}
              </Field>

              <Field label={t.crudClub.nomeEstadoAuto}>
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 disabled:bg-gray-50"
                  disabled={!isBR || saving}
                  value={form.stateName}
                  onChange={(e) => set("stateName", e.target.value)}
                  placeholder={isBR ? "Ex: São Paulo" : "—"}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t.crudClub.preencheAutomatico}
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
