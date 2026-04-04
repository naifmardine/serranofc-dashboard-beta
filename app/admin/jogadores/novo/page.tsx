"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import SuccessDialog from "@/components/Atoms/SuccessDialog";
import JogadorForm, { type JogadorFormModel } from "@/components/JogadorForm";
import AdminButton from "@/components/Atoms/AdminButton";
import { useI18n } from "@/contexts/I18nContext";

function createEmptyForm(): JogadorFormModel {
  return {
    nome: "",
    cpf: null,
    idade: null,
    posicao: "ATA",
    peDominante: "D",
    valorMercado: 0,
    variacaoPct: null,
    possePct: null,
    representacao: "",
    situacao: "",
    contratoInicio: null,
    contratoFim: null,
    numeroCamisa: null,
    altura: null,
    imagemUrl: "",
    videoUrl: "",
    instagramHandle: "",
    xUrl: "",
    youtubeUrl: "",

    anoNascimento: null,
    cidade: "",
    nacionalidade: "",

    clubeId: null,

    statsPorTemporada: null,
    passaporte: null,
    selecao: null,
  };
}

export default function NovoJogadorPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [form, setForm] = useState<JogadorFormModel>(() => createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    setCreatedId(null);

    try {
      const nome = (form.nome ?? "").trim();
      if (!nome) throw new Error(t.adminNovo.preenchaNome);
      if (!form.clubeId) throw new Error(t.adminNovo.selecioneClube);

      const payload: any = { ...form };
      delete payload.clubeRef;

      const res = await fetch("/api/jogadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      const created = data?.jogador ?? data?.player ?? (data?.id ? data : null);

      if (!created?.id) {
        throw new Error(t.adminNovo.criadoSemId);
      }

      setCreatedId(created.id);
      setSuccessMsg(t.adminNovo.criadoSucesso);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.adminNovo.erroCriar);
    } finally {
      setSaving(false);
    }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      {createdId ? (
        <button
          type="button"
          onClick={() => router.push(`/jogadores/${createdId}`)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
          title={t.adminNovo.verJogador}
        >
          <Eye className="h-4 w-4" />
          {t.adminNovo.verJogador}
        </button>
      ) : null}

      <AdminButton label={t.adminNovo.voltar} icon={ArrowLeft} href="/admin/jogadores" />
    </div>
  );

  return (
    <>
      <SuccessDialog
        open={!!successMsg}
        title={t.adminNovo.jogadorCriado}
        description={successMsg ?? undefined}
        secondaryLabel={t.adminNovo.criarOutro}
        primaryLabel={t.adminNovo.irParaAdmin}
        onSecondary={() => {
          setSuccessMsg(null);
          setCreatedId(null);
          setForm(createEmptyForm());
          setError(null);
        }}
        onPrimary={() => {
          setSuccessMsg(null);
          router.push("/admin/jogadores");
        }}
      />

      <section className="mx-auto w-full max-w-5xl bg-gray-50 p-6">
        <PageTitle
          base="Admin"
          title={t.adminNovo.title}
          subtitle={t.adminNovo.subtitle}
          actions={headerActions}
          className="mb-6"
          crumbLabel={t.adminNovo.jogadores}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <JogadorForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          saving={saving}
          submitLabel={saving ? t.adminNovo.criando : t.adminNovo.criarJogador}
          onCancel={() => router.push("/admin/jogadores")}
          requireClub
        />
      </section>
    </>
  );
}
