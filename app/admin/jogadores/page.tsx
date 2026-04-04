"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash, PlusCircle } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import AdminRow from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import { useI18n } from "@/contexts/I18nContext";

function formatCreatedAt(input: any) {
  if (!input) return "--/--/----";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleDateString("pt-BR");
}

export default function AdminJogadoresPage() {
  const { t } = useI18n();
  const [jogadores, setJogadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/jogadores", { cache: "no-store" });
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

        const raw = await res.json();
        const lista = Array.isArray(raw?.jogadores) ? raw.jogadores : Array.isArray(raw) ? raw : [];

        if (active) setJogadores(lista);
      } catch (e: any) {
        if (active) {
          setJogadores([]);
          setError(e?.message || t.adminJogadoresExtra.erroCarregar);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
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
      alert(err?.message ?? t.adminJogadores.erroDeletar);
      // mantém o modal aberto
    }
  }

  const headerActions = (
    <AdminButton label={t.adminJogadores.novoJogador} icon={PlusCircle} href="/admin/jogadores/novo" />
  );

  return (
    <section className="mx-auto w-full max-w-6xl bg-gray-50 p-6">
      <ConfirmDeleteDialog
        open={delOpen}
        title={t.adminJogadores.deletarTitle}
        description={t.adminJogadores.deletarDesc}
        itemName={delTarget?.nome ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={() => {
          setDelOpen(false);
          setDelTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <PageTitle
        base="Admin"
        title={t.adminJogadores.title}
        subtitle={t.adminJogadores.subtitle}
        actions={headerActions}
        className="mb-6"
        crumbLabel={t.adminJogadores.title}
      />

      {error && !loading && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700">
          <span />
          <span>{t.adminJogadores.jogador}</span>
          <span>{t.adminJogadores.criadoEm}</span>
          <span />
          <span className="pr-1 text-right">{t.adminJogadores.acoes}</span>
        </div>

        {/* Linhas */}
        {loading ? (
          <div className="py-10 text-center text-gray-500">{t.adminJogadores.carregando}</div>
        ) : jogadores.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {t.adminJogadores.nenhumJogador}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jogadores.map((j) => (
              <AdminRow
                key={j.id}
                foto={j.imagemUrl}
                title={j.nome}
                subtitle={j.posicao}
                createdAt={formatCreatedAt(j.createdAt)}
                actions={[
                  { icon: Eye, href: `/jogadores/${j.id}`, color: "blue" },
                  { icon: Pencil, href: `/admin/jogadores/${j.id}/editar`, color: "yellow" },
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
          </div>
        )}
      </div>
    </section>
  );
}
