"use client";

import * as React from "react";
import { Pencil, Trash, PlusCircle } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import AdminRow from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";

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

  const closeDelete = React.useCallback(() => {
    setDelOpen(false);
    setDelTarget(null);
  }, []);

  async function confirmDelete() {
    if (!delTarget?.id) return;

    try {
      await api(`/api/clubs/${delTarget.id}`, { method: "DELETE" });
      setClubs((prev) => prev.filter((c) => c.id !== delTarget.id));
      closeDelete();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir.");
    }
  }

  const headerActions = (
    <AdminButton label="Novo Clube" icon={PlusCircle} href="/admin/clubes/novo" />
  );

  return (
    <section className="mx-auto w-full max-w-6xl bg-gray-50 p-6">
      <ConfirmDeleteDialog
        open={delOpen}
        title="Deletar clube"
        description="Isso é irreversível. Jogadores vinculados ficarão com clubeId nulo."
        itemName={delTarget?.nome ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />

      <PageTitle
        base="Admin"
        title="Clubes"
        subtitle="Gerencie os clubes cadastrados e crie novos registros."
        actions={headerActions}
        className="mb-6"
        crumbLabel="Clubes"
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Head */}
        <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700">
          <span />
          <span>Clube</span>
          <span>Local</span>
          <span>Criado em</span>
          <span className="pr-1 text-right">Ações</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {clubs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              Nenhum clube cadastrado ainda.
            </div>
          ) : (
            clubs.map((c) => {
              const loc =
                c.countryCode === "BR"
                  ? `BR • ${c.stateCode ?? "—"}`
                  : c.countryCode || "—"

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
            })
          )}
        </div>
      </div>
    </section>
  );
}
