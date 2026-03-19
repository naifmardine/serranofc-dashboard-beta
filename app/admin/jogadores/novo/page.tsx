"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import SuccessDialog from "@/components/Atoms/SuccessDialog";
import JogadorForm, { type JogadorFormModel } from "@/components/JogadorForm";
import AdminButton from "@/components/Atoms/AdminButton";

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
      if (!nome) throw new Error("Preencha o nome do jogador.");
      if (!form.clubeId) throw new Error("Selecione um clube cadastrado.");

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
        throw new Error("Jogador criado, mas a API não retornou o ID.");
      }

      setCreatedId(created.id);
      setSuccessMsg("Jogador criado com sucesso.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar jogador.");
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
          title="Ver jogador"
        >
          <Eye className="h-4 w-4" />
          Ver jogador
        </button>
      ) : null}

      <AdminButton label="Voltar" icon={ArrowLeft} href="/admin/jogadores" />
    </div>
  );

  return (
    <>
      <SuccessDialog
        open={!!successMsg}
        title="Jogador criado"
        description={successMsg ?? undefined}
        secondaryLabel="Criar outro"
        primaryLabel="Ir para admin"
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
          title="Novo jogador"
          subtitle="Cadastre um novo jogador e vincule a um clube."
          actions={headerActions}
          className="mb-6"
          crumbLabel="Jogadores"
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
          submitLabel={saving ? "Criando..." : "Criar jogador"}
          onCancel={() => router.push("/admin/jogadores")}
          requireClub
        />
      </section>
    </>
  );
}
