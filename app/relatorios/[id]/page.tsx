"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/contexts/I18nContext";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PageTitle from "@/components/Atoms/PageTitle";
import ExportPrintButton from "@/components/ExportPrintButton";
import { useDashboardPdfExport } from "@/hooks/useDashboardPdfExport";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
} from "lucide-react";

const SERRANO_BLUE = "#003399";

type Report = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  conversationId: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { exportRef, exportPdf, exporting } = useDashboardPdfExport();

  useEffect(() => {
    if (!params?.id) return;

    fetch(`/api/reports/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => setReport(d.report))
      .catch(() => setError(t.relatorioDetail.naoEncontrado))
      .finally(() => setLoading(false));
  }, [params?.id]);

  function handleExportPdf() {
    if (!report || exporting) return;

    void exportPdf({
      filename: `${
        report.title
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .trim()
          .replace(/\s+/g, "_") || "relatorio"
      }.pdf`,
      format: "a4",
      orientation: "portrait",
      marginMm: 12,
      scale: 2,
      blockSelector: `[data-pdf-block="true"]`,
      header: {
        title: report.title,
        rightText: formatDate(report.createdAt),
      },
      footer: {
        leftText: t.relatorioDetail.confidencial,
        rightText: "Serrano AI",
        pageLabel: t.pdfExport.pagina,
        ofLabel: t.pdfExport.de,
      },
    });
  }

  const headerActions = (
    <div className="flex items-center gap-2" data-no-export="true">
      <Link
        href="/relatorios"
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-gray-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t.relatorioDetail.relatorios}
      </Link>

      {report && (
        <ExportPrintButton
          onClick={handleExportPdf}
          loading={exporting}
          disabled={exporting}
          subtitle={t.relatorioDetail.baixarRelatorio}
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <section className="w-full bg-gray-50 p-6">
        <div className="mx-auto w-full max-w-5xl">
          <PageTitle
            base={t.common.principal}
            title={t.relatorioDetail.carregando}
            crumbLabel={t.relatorioDetail.relatorios}
          />
          <div className="mt-6 flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.relatorioDetail.carregandoRelatorio}
          </div>
        </div>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="w-full bg-gray-50 p-6">
        <div className="mx-auto w-full max-w-5xl">
          <PageTitle base={t.common.principal} title={t.relatorioDetail.erro} crumbLabel={t.relatorioDetail.relatorios} />
          <div className="mt-6 max-w-lg rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
              <div>
                <div className="font-semibold text-red-600">
                  {t.relatorioDetail.naoEncontrado}
                </div>
                <div className="mt-0.5 text-slate-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-5xl">
        <PageTitle
          base={t.common.principal}
          crumbLabel={t.relatorioDetail.relatorios}
          title={report.title}
          subtitle={formatDate(report.createdAt)}
          actions={headerActions}
        />

        <div className="mt-6">
          <div
            ref={exportRef}
            className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm"
          >
            <div
              className="mb-6 flex items-start gap-3 border-b border-gray-100 pb-6"
              data-pdf-block="true"
            >
              <div
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
                style={{ borderLeft: `3px solid ${SERRANO_BLUE}` }}
              >
                <FileText className="h-5 w-5 text-slate-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900">
                  {report.title}
                </h1>
                <p className="mt-1 text-xs text-gray-500">
                  Serrano AI · {formatDate(report.createdAt)}
                </p>
              </div>
            </div>

            <div
              className="prose-report text-sm leading-relaxed text-slate-800"
              data-pdf-block="true"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mt-6 mb-3 text-xl font-bold text-gray-900 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2
                      className="mt-6 mb-2 border-b pb-2 text-base font-bold text-gray-900 first:mt-0"
                      style={{ borderBottomColor: `${SERRANO_BLUE}20` }}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-4 mb-1 text-sm font-semibold text-gray-800 first:mt-0">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-3 list-disc space-y-1 pl-5">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 list-decimal space-y-1 pl-5">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  hr: () => <hr className="my-5 border-gray-200" />,
                  blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-2 border-gray-300 pl-4 italic text-gray-600">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");

                    if (isBlock) {
                      return (
                        <code className="my-3 block overflow-x-auto whitespace-pre rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-800">
                          {children}
                        </code>
                      );
                    }

                    return (
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  table: ({ children }) => (
                    <div className="my-4 overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full border-collapse text-xs">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-50 font-semibold text-gray-700">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-gray-100">
                      {children}
                    </tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-gray-50">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-semibold text-gray-700">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2.5 text-gray-700">{children}</td>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                      style={{ color: SERRANO_BLUE }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {report.content}
              </ReactMarkdown>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400">{t.relatorioDetail.confidencial}</p>
              <p className="text-xs text-gray-400">
                {formatDate(report.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}