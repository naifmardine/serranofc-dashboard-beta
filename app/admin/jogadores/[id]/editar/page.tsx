"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import AdminButton from "@/components/Atoms/AdminButton";
import SuccessDialog from "@/components/Atoms/SuccessDialog";
import JogadorForm, { type JogadorFormModel } from "@/components/JogadorForm";

export default function EditarJogadorPage() {
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
        setError(err?.message || "Erro ao carregar jogador.");
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

      setSuccessMsg("Jogador atualizado com sucesso.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao salvar jogador.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-5xl bg-gray-50 p-6">
        <div className="text-sm text-gray-700">Carregando dados do jogador...</div>
      </section>
    );
  }

  if (!form) {
    return (
      <section className="mx-auto w-full max-w-5xl bg-gray-50 p-6">
        <h1 className="mb-2 text-lg font-bold text-slate-900">
          Erro ao carregar jogador
        </h1>
        <p className="mb-4 text-sm text-red-600">{error || "Erro desconhecido."}</p>
        <Link href="/admin/jogadores" className="text-sm underline text-slate-700">
          Voltar
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
        title="Ver jogador"
      >
        <Eye className="h-4 w-4" />
        Ver jogador
      </button>

      <AdminButton label="Voltar" icon={ArrowLeft} href="/admin/jogadores" />
    </div>
  );

  return (
    <>
      <SuccessDialog
        open={!!successMsg}
        title="Jogador atualizado"
        description={successMsg ?? undefined}
        secondaryLabel="Continuar editando"
        primaryLabel="Ver jogador"
        onSecondary={() => setSuccessMsg(null)}
        onPrimary={() => {
          setSuccessMsg(null);
          router.push(`/jogadores/${id}`);
        }}
      />

      <section className="mx-auto w-full max-w-5xl bg-gray-50 p-6">
        <PageTitle
          base="Admin"
          title="Editar jogador"
          subtitle="Atualize dados do jogador e mantenha o vínculo com o clube consistente."
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
          setForm={setForm as any}
          onSubmit={handleSubmit}
          saving={saving}
          submitLabel={saving ? "Salvando..." : "Salvar jogador"}
          onCancel={() => router.push("/admin/jogadores")}
          requireClub={false}
        />
      </section>
    </>
  );
}
