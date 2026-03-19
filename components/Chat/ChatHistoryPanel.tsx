"use client";

import { useEffect, useState, useCallback } from "react";
import {
  History,
  X,
  Trash2,
  MessageSquare,
  Loader2,
  Plus,
} from "lucide-react";
import ConfirmDeleteDialog from "../Atoms/ConfirmDeleteDialog";

const SERRANO_BLUE = "#003399";

type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

interface ChatHistoryPanelProps {
  open: boolean;
  activeConversationId: string | null;
  onClose: () => void;
  onSelectConversation: (id: string, title: string) => void;
  onNewChat: () => void;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function ChatHistoryPanel({
  open,
  activeConversationId,
  onClose,
  onSelectConversation,
  onNewChat,
}: ChatHistoryPanelProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] =
    useState<ConversationSummary | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/chats");
      if (!r.ok) throw new Error("Não foi possível carregar as conversas.");

      const { conversations: convs } = await r.json();
      setConversations(convs || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchConversations();
  }, [open, fetchConversations]);

  async function confirmDeleteConversation() {
    if (!conversationToDelete) return;

    const id = conversationToDelete.id;
    setDeletingId(id);

    try {
      const response = await fetch(`/api/chats/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let message = "Erro ao deletar a conversa.";
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch {
          // mantém mensagem padrão
        }
        throw new Error(message);
      }

      setConversations((prev) => prev.filter((c) => c.id !== id));

      if (activeConversationId === id) {
        onNewChat();
      }

      setConversationToDelete(null);
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <History
              className="h-4 w-4 shrink-0"
              style={{ color: SERRANO_BLUE }}
            />
            <span className="text-sm font-bold text-slate-800">Histórico</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition hover:bg-gray-100"
            title="Fechar"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* New chat button */}
        <div className="border-b border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-gray-400 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" style={{ color: SERRANO_BLUE }} />
            Novo chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300" />
              <p className="text-sm font-semibold text-slate-700">
                Sem conversas ainda
              </p>
              <p className="text-xs text-gray-500">
                Inicie uma conversa para ela aparecer aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2 py-2">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isDeleting = deletingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onSelectConversation(conv.id, conv.title);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectConversation(conv.id, conv.title);
                        onClose();
                      }
                    }}
                    className={`relative flex w-full cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive
                        ? "border-blue-100 bg-blue-50"
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r"
                        style={{ background: SERRANO_BLUE }}
                      />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`flex-1 truncate text-sm font-semibold leading-snug ${
                          isActive ? "text-blue-800" : "text-slate-800"
                        }`}
                      >
                        {conv.title}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConversationToDelete(conv);
                        }}
                        className="p-1.5 rounded-md text-white transition bg-red-500 hover:bg-red-600 shrink-0"
                        title="Deletar conversa"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <MessageSquare className="h-3 w-3" />
                      <span>{conv._count.messages} msgs</span>
                      <span className="text-gray-300">·</span>
                      <span>{formatDate(conv.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2.5">
          <p className="text-center text-[11px] text-gray-400">
            Últimas 50 conversas
          </p>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!conversationToDelete}
        title="Confirmar deleção da conversa"
        description="Essa ação remove a conversa e o histórico vinculado a ela. Não poderá ser desfeita."
        itemName={conversationToDelete?.title}
        expectedPhrase={
          conversationToDelete
            ? `DELETAR`
            : ""
        }
        onCancel={() => {
          if (!deletingId) setConversationToDelete(null);
        }}
        onConfirm={confirmDeleteConversation}
      />
    </>
  );
}