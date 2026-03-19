import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/authHelper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/chats/[id]/messages
 * Body: { messages: [{ role, content, attachments? }] }
 * Saves one or more messages to the conversation and bumps updatedAt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const msgs: any[] = Array.isArray(body?.messages) ? body.messages : [];

    if (msgs.length === 0) {
      return NextResponse.json({ error: "Nenhuma mensagem fornecida" }, { status: 400 });
    }

    // Verify ownership
    const conv = await prisma.chatConversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    // Validate and sanitize each message
    const validRoles = new Set(["user", "assistant"]);
    const data = msgs
      .filter((m) => validRoles.has(m?.role) && typeof m?.content === "string" && m.content.trim())
      .map((m) => ({
        conversationId: id,
        role: m.role as string,
        content: String(m.content).trim(),
        toolTraces: m.toolTraces ?? null,
        attachments: m.attachments ?? null,
      }));

    if (data.length === 0) {
      return NextResponse.json({ error: "Mensagens inválidas" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.chatMessage.createMany({ data }),
      prisma.chatConversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true, saved: data.length }, { status: 201 });
  } catch (err) {
    console.error("POST /api/chats/[id]/messages error:", err);
    return NextResponse.json({ error: "Erro ao salvar mensagens" }, { status: 500 });
  }
}
