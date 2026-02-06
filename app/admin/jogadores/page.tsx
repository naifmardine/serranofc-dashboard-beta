"use client";

import AdminRow from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import { Eye, Pencil, Trash, PlusCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatCreatedAt(input: any) {
  if (!input) return "--/--/----";

  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--/--/----";

  return d.toLocaleDateString("pt-BR");
}

export default function AdminJogadoresPage() {
  const [jogadores, setJogadores] = useState<any[]>([]);
  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/jogadores", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setJogadores(d.jogadores || []))
      .catch(() => setJogadores([]));
  }, []);

  const expectedPhrase = useMemo(() => {
    if (!delTarget?.nome) return "DELETAR";
    return `DELETAR ${String(delTarget.nome).trim()}`;
  }, [delTarget]);

  async function confirmDelete() {
    if (!delTarget?.id) return;

    try {
      const res = await fetch(`/api/jogadores/${delTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      setJogadores((prev) => prev.filter((j) => j.id !== delTarget.id));
      setDelOpen(false);
      setDelTarget(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Erro ao deletar jogador.");
      // mantém o modal aberto pra pessoa tentar de novo ou cancelar
    }
  }

  return (
    <section className="p-6 max-w-6xl mx-auto">
      <ConfirmDeleteDialog
        open={delOpen}
        title="Deletar jogador"
        description="Isso é irreversível. O jogador será removido do banco."
        itemName={delTarget?.nome ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={() => {
          setDelOpen(false);
          setDelTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin → Jogadores</h1>

        <AdminButton
          label="Novo Jogador"
          icon={PlusCircle}
          href="/admin/jogadores/novo"
        />
      </div>

      {/* Cabeçalho da tabela */}
      <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] text-xs font-semibold text-gray-500 uppercase border-b border-gray-300 pb-2 mb-2">
        <span></span>
        <span>Jogador</span>
        <span>Criado em</span>
        <span></span>
        <span className="text-right pr-3">Ações</span>
      </div>

      {/* Linhas */}
      {jogadores.map((j) => (
        <AdminRow
          key={j.id}
          foto={j.imagemUrl}
          title={j.nome}
          subtitle={j.posicao}
          createdAt={formatCreatedAt(j.createdAt)}
          actions={[
            { icon: Eye, href: `/jogadores/${j.id}`, color: "blue" },
            {
              icon: Pencil,
              href: `/admin/jogadores/${j.id}/editar`,
              color: "yellow",
            },
            {
              icon: Trash,
              color: "red",
              onClick: () => {
                setDelTarget(j);
                setDelOpen(true);
              },
            },
          ]}
        />
      ))}
    </section>
  );
}
