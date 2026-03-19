"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import PageTitle from "@/components/Atoms/PageTitle";
import { ChatMessageBubble } from "@/components/Chat/ChatMessageBubble";
import { ChatHistoryPanel } from "@/components/Chat/ChatHistoryPanel";
import {
  Plus,
  X,
  Paperclip,
  Trophy,
  History,
  Users,
  ArrowLeftRight,
  Repeat,
  BarChart3,
  Sparkles,
  AlertTriangle,
  RefreshCcw,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";

/* =========================
   Serrano colors
========================= */
const SERRANO_BLUE = "#003399";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
};

type QuickAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
};

function SendAnimatedButton({
  disabled,
  onClick,
  loading,
}: {
  disabled: boolean;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !!loading}
      title="Enviar"
      className={cn(
        "sfc-send-btn group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-2xl border px-4 text-sm font-semibold shadow-sm transition active:scale-[0.98]",
        disabled || loading
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer",
      )}
      style={{
        background: disabled || loading ? "white" : SERRANO_BLUE,
        color: disabled || loading ? "#94a3b8" : "white",
        borderColor: disabled || loading ? "#e5e7eb" : SERRANO_BLUE,
      }}
    >
      <span className="sfc-svg-wrapper-1 inline-flex items-center">
        <span className="sfc-svg-wrapper inline-flex items-center">
          {loading ? (
            <RefreshCcw className="h-5 w-5 animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width={20}
              height={20}
              className="sfc-send-svg block"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path
                fill="currentColor"
                d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
              />
            </svg>
          )}
        </span>
      </span>
      <span className="sfc-send-text block">
        {loading ? "Enviando…" : "Enviar"}
      </span>
      {!disabled && !loading ? (
        <span
          className="pointer-events-none absolute left-0 top-0 h-full w-1"
          style={{ background: SERRANO_BLUE }}
        />
      ) : null}
    </button>
  );
}

type ChatRole = "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
};

type ChatApiResponse = {
  conversation_id: string | null;
  assistant_message: string;
  citations?: any[];
  tool_traces?: any[];
  error?: string;
  raw?: any;
};

function uuidish() {
  return `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function mapFriendlyError(payload: any, status: number) {
  const detail =
    payload?.detail ?? payload?.error ?? payload?.message ?? payload?.raw ?? "";
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);

  if (status === 401)
    return "Acesso negado (401). Verifique a chave interna e o proxy do Next.";
  if (status === 402 || /insufficient|funds|quota|billing|payment/i.test(text))
    return "OpenAI sem créditos / quota estourada. Verifique billing e limites.";
  if (status === 429 || /rate/i.test(text))
    return "Muitas requisições (429). Aguarde e tente novamente.";
  if (status === 504 || /timeout/i.test(text))
    return "Timeout na resposta do backend. Tente novamente.";
  if (status >= 500) return "Erro no servidor. Confira logs do FastAPI/Next.";
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|upstream/i.test(text))
    return "Não conectou no backend. Confira se o FastAPI está rodando e o BASE_URL.";
  return text ? `Falha: ${text}` : "Falha ao processar a solicitação.";
}

function makeTitle(firstMessage: string): string {
  return (
    firstMessage
      .replace(/\[Arquivo:[^\]]+\]\s*/g, "")
      .trim()
      .slice(0, 80) || "Nova conversa"
  );
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function SerranoChatPage() {
  const [input, setInput] = useState("");
  const [plusOpen, setPlusOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [dbConversationId, setDbConversationId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>(uuidish());
  const [conversationTitle, setConversationTitle] =
    useState<string>("Nova conversa");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [pendingFile, setPendingFile] = useState<{
    name: string;
    text: string;
    isImage?: boolean;
    objectUrl?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [savePhase, setSavePhase] = useState<"synthesizing" | "saving" | null>(
    null,
  );

  const [recentChats, setRecentChats] = useState<ConversationSummary[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement | null>(null);
  const [plusDropdownPos, setPlusDropdownPos] = useState<{
    bottom: number;
    left: number;
  } | null>(null);

  const hasMessages = messages.length > 0;

  const actions: QuickAction[] = useMemo(
    () => [
      {
        key: "portfolio",
        label: "Portfólio",
        icon: <Trophy className="h-3.5 w-3.5" />,
        prompt:
          "Analise o portfólio do Serrano: quais jogadores têm maior valor de mercado combinado com alto percentual de direitos? Identifique as melhores oportunidades de venda com ROI elevado.",
      },
      {
        key: "squad",
        label: "Elenco",
        icon: <Users className="h-3.5 w-3.5" />,
        prompt:
          "Faça uma análise completa do elenco: distribuição por posição e faixa etária, percentual médio de direitos do Serrano, e pontos de atenção. Finalize com 1 recomendação acionável.",
      },
      {
        key: "market",
        label: "Mercado",
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        prompt:
          "Quanto o mercado está pagando por cada posição? Analise as transferências agrupadas por posição: volume, valor médio e mediana. Compare com o elenco do Serrano.",
      },
      {
        key: "transfers",
        label: "Clubes compradores",
        icon: <Repeat className="h-3.5 w-3.5" />,
        prompt:
          "Quais clubes mais compraram jogadores no mercado geral? Mostre o ranking com total de transferências e valor médio pago.",
      },
      {
        key: "opportunity",
        label: "Oportunidades",
        icon: <ArrowLeftRight className="h-3.5 w-3.5" />,
        prompt:
          "Identifique jogadores com maior potencial de venda: cruze valor de mercado, e % de direitos. Quem tem o melhor ROI potencial?",
      },
    ],
    [],
  );

  const fetchRecentChats = useCallback(async () => {
    try {
      const r = await fetch("/api/chats");
      if (!r.ok) return;
      const { conversations } = await r.json();
      setRecentChats((conversations || []).slice(0, 6));
    } catch {}
  }, []);

  useEffect(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const maxH = 180;
    const newH = Math.min(el.scrollHeight, maxH);
    el.style.height = `${newH}px`;
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }, []);

  function setPrompt(p: string) {
    setInput(p);
    setPlusOpen(false);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      autosize();
    }, 0);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    }, 0);
  }

  useEffect(() => {
    if (hasMessages) scrollToBottom("auto");
  }, [hasMessages]);

  async function ensureDbConversation(title: string): Promise<string | null> {
    if (dbConversationId) return dbConversationId;
    try {
      const r = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!r.ok) return null;
      const { conversation } = await r.json();
      setDbConversationId(conversation.id);
      setConversationTitle(title);
      return conversation.id;
    } catch {
      return null;
    }
  }

  async function persistMessages(
    convId: string,
    userContent: string,
    assistantContent: string,
    attachmentMeta?: { name: string } | null,
  ) {
    try {
      await fetch(`/api/chats/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: userContent,
              attachments: attachmentMeta ? [attachmentMeta] : null,
            },
            { role: "assistant", content: assistantContent },
          ],
        }),
      });
    } catch {}
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setErrorBanner(null);
    setNotice(null);

    let userContent = text;
    const attachmentMeta = pendingFile ? { name: pendingFile.name } : null;

    if (pendingFile) {
      if (pendingFile.isImage) {
        userContent = `[Imagem anexada: ${pendingFile.name}]\n\n${text}`;
      } else if (pendingFile.text) {
        userContent = `[Arquivo: ${pendingFile.name}]\n\n${pendingFile.text}\n\n---\nPergunta: ${text}`;
      }

      if (pendingFile.objectUrl) URL.revokeObjectURL(pendingFile.objectUrl);
      setPendingFile(null);
    }

    const userMsg: ChatMessage = {
      id: uuidish(),
      role: "user",
      content: userContent,
      ts: Date.now(),
    };

    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setPlusOpen(false);
    autosize();
    scrollToBottom();
    setLoading(true);

    const isFirstMessage = messages.length === 0;
    let persistId: string | null = dbConversationId;
    if (isFirstMessage) {
      persistId = await ensureDbConversation(makeTitle(userContent));
    }

    try {
      const r = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
          context: { source: "admin/serrano-ai" },
        }),
      });

      const textBody = await r.text();
      let data: ChatApiResponse | any = {};
      try {
        data = JSON.parse(textBody);
      } catch {
        data = { raw: textBody };
      }

      if (!r.ok) {
        const msg = mapFriendlyError(data, r.status);
        setErrorBanner(msg);

        const errMsg: ChatMessage = {
          id: uuidish(),
          role: "assistant",
          content: `⚠️ ${msg}`,
          ts: Date.now(),
        };

        setMessages((prev) => [...prev, errMsg]);
        scrollToBottom();

        if (persistId) {
          persistMessages(persistId, userContent, errMsg.content, attachmentMeta);
        }
        return;
      }

      const assistantText =
        (data?.assistant_message && String(data.assistant_message).trim()) ||
        (data?.assistant && String(data.assistant).trim()) ||
        "";

      if (data?.conversation_id && typeof data.conversation_id === "string") {
        setConversationId(data.conversation_id);
      }

      const assistantMsg: ChatMessage = {
        id: uuidish(),
        role: "assistant",
        content: assistantText || "Ok. (resposta vazia do backend)",
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      scrollToBottom();

      if (persistId) {
        persistMessages(
          persistId,
          userContent,
          assistantMsg.content,
          attachmentMeta,
        );
      }
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Timeout no request."
          : "Falha de rede ao falar com o backend.";

      setErrorBanner(msg);

      const errMsg: ChatMessage = {
        id: uuidish(),
        role: "assistant",
        content: `⚠️ ${msg}`,
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, errMsg]);
      scrollToBottom();

      if (persistId) {
        persistMessages(persistId, userContent, errMsg.content, attachmentMeta);
      }
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setConversationId(uuidish());
    setDbConversationId(null);
    setConversationTitle("Nova conversa");
    setErrorBanner(null);
    setPendingFile(null);
    fetchRecentChats();
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function loadConversation(id: string, title: string) {
    setLoadingHistory(true);
    setErrorBanner(null);
    setHistoryOpen(false);

    try {
      const r = await fetch(`/api/chats/${id}`);
      if (!r.ok) throw new Error("not found");

      const { conversation } = await r.json();
      const loaded: ChatMessage[] = (conversation.messages || []).map(
        (m: any) => ({
          id: m.id,
          role: m.role as ChatRole,
          content: m.content,
          ts: new Date(m.createdAt).getTime(),
        }),
      );

      setMessages(loaded);
      setDbConversationId(id);
      setConversationTitle(title);
      setConversationId(uuidish());
      setPendingFile(null);
      scrollToBottom("auto");
    } catch {
      setNotice("Não foi possível carregar a conversa.");
      window.setTimeout(() => setNotice(null), 2000);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function saveReport() {
    if (!reportTitle.trim() || messages.length === 0) return;

    setSavingReport(true);
    setSavePhase("synthesizing");

    const contextMsgs = messages
      .slice(-30)
      .map((m) => ({ role: m.role, content: m.content }));

    const synthesisPrompt =
      "Com base na conversa acima, gere um relatório executivo em Markdown bem estruturado.\n\n" +
      "O relatório deve conter as seções relevantes da análise realizada, como:\n" +
      "- Contexto da análise\n- Principais perguntas e objetivos\n" +
      "- Insights e dados relevantes encontrados\n- Recomendações ou conclusões\n\n" +
      "Use formatação Markdown limpa. Seja objetivo e executivo. Não inclua a transcrição literal da conversa — apenas a síntese.";

    let content: string;

    try {
      const r = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          messages: [...contextMsgs, { role: "user", content: synthesisPrompt }],
          context: { source: "report-synthesis" },
        }),
      });

      if (r.ok) {
        const data = await r.json();
        content = data?.assistant_message?.trim() || "";
      } else {
        content = "";
      }
    } catch {
      content = "";
    }

    if (!content) {
      content = messages
        .map(
          (m) =>
            `**${m.role === "user" ? "Pergunta" : "Serrano AI"}:** ${m.content}`,
        )
        .join("\n\n---\n\n");
    }

    setSavePhase("saving");

    try {
      const r = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          content,
          conversationId: dbConversationId ?? undefined,
        }),
      });

      if (r.ok) {
        setReportModalOpen(false);
        setReportTitle("");
        setNotice("Relatório gerado. Ver em Relatórios →");
        window.setTimeout(() => setNotice(null), 3000);
      } else {
        setNotice("Erro ao salvar relatório.");
        window.setTimeout(() => setNotice(null), 2000);
      }
    } catch {
      setNotice("Erro ao salvar relatório.");
      window.setTimeout(() => setNotice(null), 2000);
    } finally {
      setSavingReport(false);
      setSavePhase(null);
    }
  }

  function openReportModal() {
    if (messages.length === 0) {
      setNotice("Sem mensagens para gerar relatório.");
      window.setTimeout(() => setNotice(null), 1800);
      return;
    }

    setReportTitle(
      conversationTitle !== "Nova conversa"
        ? conversationTitle
        : makeTitle(messages[0]?.content ?? ""),
    );
    setReportModalOpen(true);
    setPlusOpen(false);
  }

  const headerActions = (
    <div className="flex items-center gap-2" data-no-export="true">
      {hasMessages && (
        <button
          type="button"
          onClick={openReportModal}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-gray-50"
        >
          <FileText className="h-3.5 w-3.5" style={{ color: SERRANO_BLUE }} />
          Relatório
        </button>
      )}
      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-gray-50"
      >
        <History className="h-3.5 w-3.5" style={{ color: SERRANO_BLUE }} />
        Histórico
      </button>
      <button
        type="button"
        onClick={resetChat}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-gray-50"
        title="Novo chat"
      >
        <Plus className="h-3.5 w-3.5" style={{ color: SERRANO_BLUE }} />
        Novo chat
      </button>
    </div>
  );

  return (
    <section className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-6 pt-6 pb-3">
          <PageTitle
            base="Principal"
            title="Serrano AI"
            subtitle="Análise conversacional de dados"
            actions={headerActions}
          />
        </div>

        <ChatHistoryPanel
          open={historyOpen}
          activeConversationId={dbConversationId}
          onClose={() => setHistoryOpen(false)}
          onSelectConversation={loadConversation}
          onNewChat={resetChat}
        />

        {reportModalOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setReportModalOpen(false)}
            />
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText
                    className="h-4 w-4"
                    style={{ color: SERRANO_BLUE }}
                  />
                  <h2 className="text-sm font-semibold text-slate-800">
                    Gerar relatório
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="rounded-lg p-1.5 transition hover:bg-gray-100"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Título do relatório
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Ex: Análise de portfólio — março 2026"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none"
                  style={{ boxShadow: "0 0 0 3px rgba(0,51,153,0.0)" }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = "0 0 0 3px rgba(0,51,153,0.15)";
                    e.target.style.borderColor = "rgba(0,51,153,0.35)";
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = "";
                    e.target.style.borderColor = "";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveReport();
                  }}
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  O Serrano AI irá sintetizar {messages.length} mensagens em um
                  relatório executivo.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveReport}
                  disabled={!reportTitle.trim() || savingReport}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-50"
                  style={{ background: SERRANO_BLUE }}
                >
                  {savingReport && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {savePhase === "synthesizing"
                    ? "Gerando síntese…"
                    : savePhase === "saving"
                      ? "Salvando…"
                      : "Gerar relatório"}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="min-h-0 flex-1 px-6 pb-4">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
            {(notice || errorBanner) && (
              <div className="shrink-0 border-b border-gray-100 px-5 pt-4">
                {notice && (
                  <div className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm">
                    {notice}
                  </div>
                )}
                {errorBanner && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm shadow-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div>
                      <div className="font-semibold text-red-700">Erro</div>
                      <div className="mt-0.5 text-xs text-red-600">
                        {errorBanner}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              ref={scrollAreaRef}
              className="min-h-0 flex-1 overflow-y-auto items-center"
            >
              {!hasMessages ? (
                <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-5 pb-6 pt-6">
                  <div className="mb-6">
                    <div
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ background: "rgba(0,51,153,0.06)" }}
                    >
                      <Sparkles
                        className="h-5 w-5"
                        style={{ color: SERRANO_BLUE }}
                      />
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                      Olá,
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                      Analise elenco, portfólio e mercado. Cruze dados do
                      Serrano com transferências do mercado geral.
                    </p>
                  </div>

                  {recentChats.length > 0 && (
                    <div className="mt-15">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Conversas recentes
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recentChats.map((chat) => (
                          <button
                            key={chat.id}
                            type="button"
                            onClick={() => loadConversation(chat.id, chat.title)}
                            className="inline-flex max-w-[260px] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-gray-50 hover:border-gray-300"
                          >
                            <Clock className="h-3 w-3 shrink-0 text-gray-400" />
                            <span className="truncate">{chat.title}</span>
                            <span className="text-gray-400">
                              · {formatRelative(chat.updatedAt)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mx-auto w-full max-w-4xl px-5 py-5">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Carregando conversa…</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((m) => (
                        <ChatMessageBubble
                          key={m.id}
                          role={m.role}
                          content={m.content}
                        />
                      ))}
                      {loading && (
                        <ChatMessageBubble role="assistant" content="" loading />
                      )}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-white/95 p-4 backdrop-blur">
              <div className="mx-auto w-full max-w-4xl">
                {pendingFile && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                    {pendingFile.isImage && pendingFile.objectUrl ? (
                      <img
                        src={pendingFile.objectUrl}
                        alt={pendingFile.name}
                        className="h-8 w-8 shrink-0 rounded border border-gray-200 object-cover"
                      />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-600">
                      {pendingFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingFile.objectUrl)
                          URL.revokeObjectURL(pendingFile.objectUrl);
                        setPendingFile(null);
                      }}
                      className="rounded p-0.5 transition hover:bg-gray-200"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="relative shrink-0">
                    <button
                      ref={plusButtonRef}
                      type="button"
                      onClick={() => {
                        if (!plusOpen && plusButtonRef.current) {
                          const r =
                            plusButtonRef.current.getBoundingClientRect();
                          setPlusDropdownPos({
                            bottom: window.innerHeight - r.top + 8,
                            left: r.left,
                          });
                        }
                        setPlusOpen((v) => !v);
                      }}
                      title="Análises e funções"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 shadow-sm transition hover:brightness-95 active:scale-[0.98]"
                      style={{ background: SERRANO_BLUE, color: "white" }}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.json,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 2 * 1024 * 1024) {
                        setNotice("Arquivo muito grande. Máximo: 2 MB.");
                        window.setTimeout(() => setNotice(null), 2000);
                        return;
                      }

                      try {
                        const fd = new FormData();
                        fd.append("file", file);

                        const r = await fetch("/api/chatbot/upload", {
                          method: "POST",
                          body: fd,
                        });

                        if (r.ok) {
                          const data = await r.json();

                          if (data.isImage) {
                            setPendingFile({
                              name: file.name,
                              text: "",
                              isImage: true,
                              objectUrl: URL.createObjectURL(file),
                            });
                            setNotice("Imagem anexada.");
                            window.setTimeout(() => setNotice(null), 2000);
                          } else {
                            setPendingFile({
                              name: file.name,
                              text: data.extractedText,
                            });
                          }
                        } else {
                          const text = await file.text();
                          setPendingFile({ name: file.name, text });
                        }
                      } catch {
                        const text = await file.text();
                        setPendingFile({ name: file.name, text });
                      }

                      e.target.value = "";
                    }}
                  />

                  <button
                    type="button"
                    title="Anexar arquivo"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-slate-500 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]",
                      pendingFile ? "border-blue-300 bg-blue-50" : "",
                    )}
                  >
                    <Paperclip
                      className="h-4.5 w-4.5"
                      style={pendingFile ? { color: SERRANO_BLUE } : undefined}
                    />
                  </button>

                  <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        autosize();
                      }}
                      onFocus={() => setPlusOpen(false)}
                      placeholder="Pergunte algo sobre o elenco, portfólio ou mercado…"
                      rows={1}
                      className="min-h-11 w-full resize-none rounded-2xl border-0 bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                  </div>

                  <div className="shrink-0">
                    <SendAnimatedButton
                      disabled={!input.trim()}
                      loading={loading}
                      onClick={send}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {plusOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setPlusOpen(false)}
          />
        )}

        {plusOpen && plusDropdownPos && (
          <div
            className="fixed z-30 w-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
            style={{
              bottom: plusDropdownPos.bottom,
              left: plusDropdownPos.left,
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Análises rápidas
              </span>
              <button
                type="button"
                onClick={() => setPlusOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>

            <div className="p-1.5">
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setPrompt(a.prompt)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-gray-200 hover:bg-gray-50 active:bg-gray-100"
                >
                  <div
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600"
                    style={{ color: SERRANO_BLUE }}
                  >
                    {a.icon}
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    {a.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 p-1.5">
              <button
                type="button"
                onClick={openReportModal}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-gray-200 hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white">
                  <FileText
                    className="h-3.5 w-3.5"
                    style={{ color: SERRANO_BLUE }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-800">
                  Gerar relatório
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistoryOpen(true);
                  setPlusOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-gray-200 hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white">
                  <History
                    className="h-3.5 w-3.5"
                    style={{ color: SERRANO_BLUE }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-800">
                  Histórico
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        textarea:focus {
          box-shadow: none;
          border-color: transparent;
        }
        .sfc-send-btn {
          font-family: inherit;
          transition: all 0.2s;
        }
        .sfc-send-text {
          margin-left: 0.25rem;
          transition: all 0.3s ease-in-out;
          white-space: nowrap;
        }
        .sfc-send-svg {
          transform-origin: center center;
          transition: transform 0.3s ease-in-out;
        }
        .sfc-send-btn:not(:disabled):hover {
          transform: scale(1.03);
        }
        .sfc-send-btn:not(:disabled):hover .sfc-svg-wrapper {
          animation: sfc-fly-1 0.6s ease-in-out infinite alternate;
        }
        .sfc-send-btn:not(:disabled):hover .sfc-send-svg {
          transform: translateX(1em) rotate(45deg) scale(1.08);
        }
        .sfc-send-btn:not(:disabled):hover .sfc-send-text {
          transform: translateX(4.5em);
        }
        .sfc-send-btn:active {
          transform: scale(0.95);
        }
        @keyframes sfc-fly-1 {
          from {
            transform: translateY(0.1em);
          }
          to {
            transform: translateY(-0.1em);
          }
        }
        .prose-chat {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #1e293b;
        }
        .prose-chat > *:last-child {
          margin-bottom: 0 !important;
        }
      `}</style>
    </section>
  );
}