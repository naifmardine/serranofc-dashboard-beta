"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  ClipboardCopy,
  Info,
} from "lucide-react";

const REQUIRED_HEADERS = [
  "atletaNome",
  "clubeOrigem",
  "clubeDestino",
  "dataTransferencia",
  "valor",
  "moeda",
] as const;

const OPTIONAL_HEADERS = [
  "atletaIdade",
  "atletaPosicao",
  "clubeFormador",
  "cidadeClubeFormador",
  "paisClubeFormador",
  "cidadeClubeDestino",
  "paisClubeDestino",
  "fonte",
] as const;

const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS] as const;

type ImportResult = {
  ok: boolean;
  parsed: number;
  inserted: number;
  skippedDuplicates: number;
  errors?: string[];
};

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildTemplateCsv() {
  const header = ALL_HEADERS.join(",");
  const rows = [
    [
      "ESTÊVÃO",
      "PALMEIRAS",
      "CHELSEA",
      "06/01/2025",
      "34000000",
      "EUR",
      "18",
      "Ponta",
      "PALMEIRAS",
      "São Paulo",
      "Brasil",
      "London",
      "Inglaterra",
      "Transfermarkt",
    ].join(","),
    [
      "GABRIEL TALIARI",
      "CAPIVARIANO",
      "JUVENTUDE",
      "01/11/2024",
      "170000",
      "EUR",
      "26",
      "Atacante",
      "CAPIVARIANO",
      "",
      "Brasil",
      "Caxias do Sul",
      "Brasil",
      "Sofascore",
    ].join(","),
  ].join("\n");

  return `${header}\n${rows}\n`;
}

async function readFirstLine(file: File) {
  const text = await file.text();
  return (text.split(/\r?\n/)[0] ?? "").trim();
}

function splitHeaderLine(line: string) {
  const sep = line.includes(";") && !line.includes(",") ? ";" : ",";
  return line
    .split(sep)
    .map((h) => h.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function prettyHeaders(list: readonly string[]) {
  return list.join(", ");
}

export default function ImportTransferenciasCsvButton({
  onImported,
}: {
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // âncora única pra scroll (erro OU sucesso)
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);

  // UI: erro compacto + missing headers em lista
  const [err, setErr] = useState<string | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);

  const [result, setResult] = useState<ImportResult | null>(null);
  const [copied, setCopied] = useState(false);

  const canUpload = useMemo(() => !!file && !busy, [file, busy]);

  // scroll sempre que aparecer erro ou sucesso
  useEffect(() => {
    if (!open) return;
    if (!err && !result) return;

    // garante que o DOM renderizou
    requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [open, err, result]);

  function resetState() {
    setFile(null);
    setErr(null);
    setMissingHeaders([]);
    setResult(null);
    setCopied(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onPick(f: File | null) {
    resetState();
    if (!f) return;

    if (!f.name.toLowerCase().endsWith(".csv")) {
      setErr("Envie um arquivo .csv");
      return;
    }

    try {
      const first = await readFirstLine(f);
      if (!first) throw new Error("CSV vazio (sem linha de headers).");

      const headers = splitHeaderLine(first);
      const set = new Set(headers.map((h) => h.trim()));
      const missing = REQUIRED_HEADERS.filter((h) => !set.has(h));

      if (missing.length) {
        setMissingHeaders([...missing]);
        throw new Error("Faltando colunas obrigatórias.");
      }

      setFile(f);
    } catch (e: any) {
      setErr(e?.message ?? "CSV inválido.");
      setFile(null);
    }
  }

  async function onSend() {
    if (!file) return;

    setBusy(true);
    setErr(null);
    setMissingHeaders([]);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await fetch("/api/transferencias/import", {
        method: "POST",
        body: fd,
      });

      const data = (await r.json()) as ImportResult;

      if (!r.ok || !data.ok) {
        const msg = data?.errors?.join("\n") ?? "Erro ao importar CSV.";
        throw new Error(msg);
      }

      setResult(data);
      onImported?.();
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao importar CSV.");
    } finally {
      setBusy(false);
    }
  }

  async function copyHeaders() {
    try {
      await navigator.clipboard.writeText(ALL_HEADERS.join(","));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const helpText = (
    <div className="mt-3 grid gap-2 text-xs text-slate-600">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 text-slate-500" />
        <div className="space-y-1">
          <div>
            <b>Data:</b> <span className="font-mono">DD/MM/YYYY</span> ou{" "}
            <span className="font-mono">YYYY-MM-DD</span>
          </div>
          <div>
            <b>Valor:</b> <span className="font-mono">34000000</span> ou{" "}
            <span className="font-mono">34.000.000,00</span>
          </div>
          <div>
            <b>Separador:</b> vírgula ou ponto-e-vírgula
          </div>
        </div>
      </div>
    </div>
  );

  const headersPreview = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">
            Obrigatórias
          </div>
          <div className="mt-1 text-sm text-slate-800 leading-relaxed wrap-break-word">
            {prettyHeaders(REQUIRED_HEADERS)}
          </div>

          <div className="mt-3 text-[11px] uppercase tracking-wider text-slate-500">
            Opcionais
          </div>
          <div className="mt-1 text-sm text-slate-800 leading-relaxed wrap-break-word">
            {prettyHeaders(OPTIONAL_HEADERS)}
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              downloadTextFile("transferencias_template.csv", buildTemplateCsv())
            }
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] transition cursor-pointer"
            title="Baixar template"
          >
            <FileText className="w-4 h-4" />
            Template
          </button>

          <button
            type="button"
            onClick={copyHeaders}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] transition cursor-pointer"
            title="Copiar headers"
          >
            <ClipboardCopy className="w-4 h-4" />
            {copied ? "Copiado" : "Headers"}
          </button>
        </div>
      </div>

      {helpText}
    </div>
  );

  return (
    <>
      <button
        onClick={() => {
          resetState();
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border bg-white text-slate-900 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition cursor-pointer"
      >
        <Upload className="w-4 h-4" />
        Importar CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-100">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            onClick={() => !busy && setOpen(false)}
          />

          {/* modal */}
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-[min(760px,94vw)] max-h-[88vh] rounded-3xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(0,0,0,0.35)] overflow-hidden">
              {/* header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-slate-900 leading-tight">
                    Importar transferências (CSV)
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Duplicatas são ignoradas automaticamente.
                  </div>
                </div>

                <button
                  onClick={() => !busy && setOpen(false)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-2xl hover:bg-slate-100 active:scale-[0.98] transition cursor-pointer"
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X className="w-4 h-4 text-slate-700" />
                </button>
              </div>

              {/* body (scrollável) */}
              <div className="p-5 space-y-4 overflow-y-auto overscroll-contain max-h-[calc(88vh-72px-72px)]">
                {headersPreview}

                {/* dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0] ?? null;
                    onPick(f);
                  }}
                  className={cx(
                    "rounded-3xl border border-dashed p-5 transition bg-white border-slate-300",
                    !busy && "hover:bg-slate-50",
                  )}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-slate-600" />
                    </div>

                    <div className="text-sm text-slate-700">
                      Arraste um CSV aqui ou{" "}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                        className="font-semibold underline underline-offset-2 hover:text-slate-900 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        selecione no computador
                      </button>
                      .
                    </div>

                    <input
                      ref={inputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                    />

                    {file ? (
                      <div className="mt-1 text-xs text-slate-600">
                        Selecionado:{" "}
                        <span className="font-semibold text-slate-900 break-all">
                          {file.name}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">
                        Dica: use o template pra evitar erro de header.
                      </div>
                    )}
                  </div>
                </div>

                {/* âncora de scroll */}
                {(err || result) && <div ref={feedbackRef} />}

                {/* erro (compacto + sempre dentro do modal) */}
                {err && (
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="min-w-0 w-full">
                        <div className="font-semibold">{err}</div>

                        {missingHeaders.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-red-700/90">
                              Faltando:
                            </div>
                            <ul className="mt-1 list-disc pl-5 space-y-0.5 text-[13px]">
                              {missingHeaders.map((h) => (
                                <li key={h} className="wrap-break-word">
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* se vier erro gigante do backend, segura overflow */}
                        <pre className="mt-3 text-[12px] leading-relaxed whitespace-pre-wrap wrap-break-word max-h-60 overflow-auto rounded-2xl border border-red-200/60 bg-white/60 p-3">
                          Obrigatórias: {prettyHeaders(REQUIRED_HEADERS)}
                          {"\n"}
                          Opcionais: {prettyHeaders(OPTIONAL_HEADERS)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <div className="font-semibold">Importação concluída</div>
                        <div className="text-emerald-900">
                          Processadas: <b>{result.parsed}</b> · Inseridas:{" "}
                          <b>{result.inserted}</b> · Ignoradas:{" "}
                          <b>{result.skippedDuplicates}</b>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* footer */}
              <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className="h-10 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>

                <button
                  disabled={!canUpload}
                  onClick={onSend}
                  className="h-10 px-5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  title={file ? "Importar CSV" : "Selecione um CSV válido primeiro"}
                >
                  {busy ? "Importando..." : "Importar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
