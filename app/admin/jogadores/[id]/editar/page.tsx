"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import AdminButton from "@/components/Atoms/AdminButton";
import SuccessDialog from "@/components/Atoms/SuccessDialog";
import JogadorForm, { type JogadorFormModel } from "@/components/JogadorForm";
import { useI18n } from "@/contexts/I18nContext";

export default function EditarJogadorPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [form, setForm] = useState<JogadorFormModel | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/jogadores/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Erro HTTP ${res.status}`);
        }

        const data = await res.json().catch(() => ({}));
        const j = (data.jogador ?? data) as JogadorFormModel;

        const clubeIdFromRef = (j as any)?.clubeRef?.id ?? null;

        if (!active) return;
        setForm({
          ...j,
          clubeId: (j as any).clubeId ?? clubeIdFromRef,
        });
      } catch (err: any) {
        if (!active) return;
        console.error(err);
        setError(err?.message || t.adminEditarJogador.erroCarregar);
        setForm(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !form) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: any = { ...form };
      delete payload.clubeRef;

      const res = await fetch(`/api/jogadores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      const j = (data.jogador ?? data) as JogadorFormModel;

      setForm({
        ...j,
        clubeId:
          (j as any).clubeId ??
          (j as any)?.clubeRef?.id ??
          (form as any).clubeId ??
          null,
      });

      setSuccessMsg(t.adminEditarJogador.jogadorAtualizadoMsg);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t.adminEditarJogador.erroSalvar);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-5xl bg-gray-50 p-6">
        <div className="text-sm text-gray-700">{t.adminEditarJogador.carregando}</div>
      </section>
    );
  }

  if (!form) {
    return (
      <section className="mx-auto w-full max-w-5xl bg-gray-50 p-6">
        <h1 className="mb-2 text-lg font-bold text-slate-900">
          {t.adminEditarJogador.erroCarregar}
        </h1>
        <p className="mb-4 text-sm text-red-600">{error || t.adminEditarJogador.erroDesconhecido}</p>
        <Link href="/admin/jogadores" className="text-sm underline text-slate-700">
          {t.adminEditarJogador.voltar}
        </Link>
      </section>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/jogadores/${id}`)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
        title={t.adminEditarJogador.verJogador}
      >
        <Eye className="h-4 w-4" />
        {t.adminEditarJogador.verJogador}
      </button>

      <AdminButton label={t.adminEditarJogador.voltar} icon={ArrowLeft} href="/admin/jogadores" />
    </div>
  );

  return (
    <>
      <SuccessDialog
        open={!!successMsg}
        title={t.adminEditarJogador.jogadorAtualizado}
        description={successMsg ?? undefined}
        secondaryLabel={t.adminEditarJogador.continuarEditando}
        primaryLabel={t.adminEditarJogador.verJogador}
        onSecondary={() => setSuccessMsg(null)}
        onPrimary={() => {
          setSuccessMsg(null);
          router.push(`/jogadores/${id}`);
        }}
      />

      <section className="mx-auto w-full max-w-5xl bg-gray-50 p-6">
        <PageTitle
          base="Admin"
          title={t.adminEditarJogador.title}
          subtitle={t.adminEditarJogador.subtitle}
          actions={headerActions}
          className="mb-6"
          crumbLabel={t.adminJogadores.title}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <JogadorForm
          form={form}
          setForm={setForm as any}
          onSubmit={handleSubmit}
          saving={saving}
          submitLabel={saving ? t.adminEditarJogador.salvando : t.adminEditarJogador.salvarJogador}
          onCancel={() => router.push("/admin/jogadores")}
          requireClub={false}
        />
      </section>
    </>
  );
}
