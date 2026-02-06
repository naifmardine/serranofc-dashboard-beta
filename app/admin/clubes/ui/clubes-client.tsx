"use client";

import AdminRow from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import { Pencil, Trash, PlusCircle } from "lucide-react";
import * as React from "react";

type ClubRow = {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  countryCode?: string | null;
  stateCode?: string | null;
  continentCode?: string | null;
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

export default function ClubesClient({ initialClubs }: { initialClubs: ClubRow[] }) {
  const [clubs, setClubs] = React.useState<ClubRow[]>(initialClubs);
  const [delOpen, setDelOpen] = React.useState(false);
  const [delTarget, setDelTarget] = React.useState<ClubRow | null>(null);

  const expectedPhrase = React.useMemo(() => {
    if (!delTarget?.nome) return "DELETAR";
    return `DELETAR ${String(delTarget.nome).trim()}`;
  }, [delTarget]);

  async function confirmDelete() {
    if (!delTarget?.id) return;

    try {
      await api(`/api/clubs/${delTarget.id}`, { method: "DELETE" });
      setClubs((prev) => prev.filter((c) => c.id !== delTarget.id));
      setDelOpen(false);
      setDelTarget(null);
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  }

  return (
    <section className="p-6 max-w-6xl mx-auto">
      <ConfirmDeleteDialog
        open={delOpen}
        title="Deletar clube"
        description="Isso é irreversível. Jogadores vinculados ficarão com clubeId nulo."
        itemName={delTarget?.nome ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={() => {
          setDelOpen(false);
          setDelTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin → Clubes</h1>

        <AdminButton label="Novo Clube" icon={PlusCircle} href="/admin/clubes/novo" />
      </div>

      <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] text-xs font-semibold text-gray-500 uppercase border-b border-gray-300 pb-2 mb-2">
        <span></span>
        <span>Clube</span>
        <span>Local</span>
        <span>Criado em</span>
        <span className="text-right pr-3">Ações</span>
      </div>

      {clubs.map((c) => {
        const loc =
          c.countryCode === "BR"
            ? `BR • ${c.stateCode ?? "—"}`
            : c.countryCode
              ? c.countryCode
              : "—";

        return (
          <AdminRow
            key={c.id}
            foto={c.logoUrl}
            title={c.nome}
            subtitle={`${c.slug} • ${loc}`}
            createdAt={c.createdAt}
            actions={[
              { icon: Pencil, href: `/admin/clubes/${c.id}`, color: "yellow" },
              {
                icon: Trash,
                color: "red",
                onClick: () => {
                  setDelTarget(c);
                  setDelOpen(true);
                },
              },
            ]}
          />
        );
      })}
    </section>
  );
}
