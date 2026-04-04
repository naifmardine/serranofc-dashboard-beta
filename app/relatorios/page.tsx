"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageTitle from "@/components/Atoms/PageTitle";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import { useI18n } from "@/contexts/I18nContext";
import {
  FileText,
  Trash2,
  Loader2,
  Plus,
  ChevronRight,
  MessageSquare,
  Pencil,
  X,
} from "lucide-react";

const SERRANO_BLUE = "#003399";

type ReportSummary = {
  id: string;
  title: string;
  createdAt: string;
  conversationId: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RelatoriosPage() {
  const { t } = useI18n();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<ReportSummary | null>(
    null
  );

  const [reportToRename, setReportToRename] = useState<ReportSummary | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then(async (r) => {
        if (!r.ok) throw new Error(t.common.erro);
        return r.json();
      })
      .then((d) => setReports(d?.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  function openRenameModal(report: ReportSummary) {
    setReportToRename(report);
    setRenameValue(report.title);
    setRenameError(null);
  }

  function closeRenameModal() {
    if (renaming) return;
    setReportToRename(null);
    setRenameValue("");
    setRenameError(null);
  }

  async function confirmRenameReport() {
    if (!reportToRename) return;

    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      setRenameError(t.relatorios.tituloInvalido);
      return;
    }

    if (nextTitle.length > 200) {
      setRenameError(t.relatorios.tituloMax200);
      return;
    }

    if (nextTitle === reportToRename.title) {
      closeRenameModal();
      return;
    }

    setRenaming(true);
    setRenameError(null);

    try {
      const response = await fetch(`/api/reports/${reportToRename.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || t.relatorios.erroRenomear);
      }

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportToRename.id ? { ...r, title: data.report.title } : r
        )
      );

      closeRenameModal();
    } catch (err: any) {
      setRenameError(err?.message || t.relatorios.erroRenomear);
    } finally {
      setRenaming(false);
    }
  }

  async function confirmDeleteReport() {
    if (!reportToDelete) return;

    const id = reportToDelete.id;
    setDeletingId(id);

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let message = t.relatoriosExtra.erroDeletar;
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch {
          // mantém mensagem padrão
        }
        throw new Error(message);
      }

      setReports((prev) => prev.filter((r) => r.id !== id));
      setReportToDelete(null);
    } finally {
      setDeletingId(null);
    }
  }

  const headerActions = (
    <Link
      href="/admin/serrano-ai"
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-gray-50"
    >
      <Plus className="h-3.5 w-3.5" style={{ color: SERRANO_BLUE }} />
      {t.relatorios.novoChat}
    </Link>
  );

  return (
    <>
      <section className="w-full bg-gray-50 p-6">
        <div className="mx-auto w-full max-w-5xl">
          <PageTitle
            base={t.common.principal}
            title={t.relatorios.title}
            subtitle={t.relatorios.subtitle}
            actions={headerActions}
          />

          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.relatorios.carregando}
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
                <FileText className="h-10 w-10 text-gray-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {t.relatorios.nenhumRelatorio}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t.relatorios.nenhumRelatorioDesc}
                  </p>
                </div>

                <Link
                  href="/admin/serrano-ai"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                  style={{ background: SERRANO_BLUE }}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t.relatorios.irParaChat}
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    {reports.length}{" "}
                    {reports.length === 1 ? t.relatorios.relatorio : t.relatorios.relatorios}
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {reports.map((report) => {
                    const isDeleting = deletingId === report.id;

                    return (
                      <div
                        key={report.id}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
                      >
                        <div
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
                          style={{ borderLeft: `3px solid ${SERRANO_BLUE}` }}
                        >
                          <FileText className="h-4 w-4 text-slate-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {report.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(report.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openRenameModal(report)}
                            className="p-2 rounded-md text-white transition bg-yellow-500 hover:bg-yellow-600"
                            title={t.relatorios.renomear}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setReportToDelete(report)}
                            className="p-2 rounded-md text-white transition bg-red-500 hover:bg-red-600"
                            title={t.relatorios.deletar}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>

                        <Link
                          href={`/relatorios/${report.id}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-gray-50"
                        >
                          {t.relatorios.abrir}
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <ConfirmDeleteDialog
        open={!!reportToDelete}
        title={t.relatorios.confirmarDelecao}
        description={t.relatorios.confirmarDelecaoDesc}
        itemName={reportToDelete?.title}
        expectedPhrase="DELETAR"
        onCancel={() => {
          if (!deletingId) setReportToDelete(null);
        }}
        onConfirm={confirmDeleteReport}
      />

      {reportToRename && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={closeRenameModal}
          />

          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4" style={{ color: SERRANO_BLUE }} />
                <h2 className="text-sm font-semibold text-slate-800">
                  {t.relatorios.renomearTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeRenameModal}
                className="rounded-lg p-1.5 transition hover:bg-gray-100"
                disabled={renaming}
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                {t.relatorios.novoTitulo}
              </label>

              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder={t.relatorios.digiteTitulo}
                maxLength={200}
                autoFocus
                disabled={renaming}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void confirmRenameReport();
                  }
                }}
              />

              <p className="mt-1.5 text-xs text-gray-400">
                {t.relatorios.tituloMaxChars}
              </p>

              {renameError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {renameError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRenameModal}
                disabled={renaming}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
              >
                {t.relatorios.cancelar}
              </button>

              <button
                type="button"
                onClick={() => void confirmRenameReport()}
                disabled={!renameValue.trim() || renaming}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-50"
                style={{ background: SERRANO_BLUE }}
              >
                {renaming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {renaming ? t.relatorios.salvando : t.relatorios.salvar}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}