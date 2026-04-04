"use client";

import * as React from "react";
import { Pencil, Trash, PlusCircle } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import AdminRow from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import { useI18n } from "@/contexts/I18nContext";

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

export default function ClubesClient({ initialClubs }: { initialClubs: ClubRow[] }) {
  const { t } = useI18n();
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
      const res = await fetch(`/api/clubs/${delTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        let msg = t.adminClubes.erroInesperado;
        try {
          const data = await res.json();
          msg = data?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      setClubs((prev) => prev.filter((c) => c.id !== delTarget.id));
      closeDelete();
    } catch (e: any) {
      alert(e?.message || t.adminClubes.erroExcluir);
    }
  }

  const headerActions = (
    <AdminButton label={t.adminClubes.novoClube} icon={PlusCircle} href="/admin/clubes/novo" />
  );

  return (
    <section className="mx-auto w-full max-w-6xl bg-gray-50 p-6">
      <ConfirmDeleteDialog
        open={delOpen}
        title={t.adminClubes.deletarTitle}
        description={t.adminClubes.deletarDesc}
        itemName={delTarget?.nome ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />

      <PageTitle
        base="Admin"
        title={t.adminClubes.title}
        subtitle={t.adminClubes.subtitle}
        actions={headerActions}
        className="mb-6"
        crumbLabel={t.adminClubes.title}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Head */}
        <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700">
          <span />
          <span>{t.adminClubes.clube}</span>
          <span>{t.adminClubes.local}</span>
          <span>{t.adminClubes.criadoEm}</span>
          <span className="pr-1 text-right">{t.adminClubes.acoes}</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {clubs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              {t.adminClubes.nenhumClube}
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
