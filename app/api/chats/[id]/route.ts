import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/authHelper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/chats/[id] — fetch conversation with messages */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    const conversation = await prisma.chatConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            attachments: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("GET /api/chats/[id] error:", err);
    return NextResponse.json({ error: "Erro ao buscar conversa" }, { status: 500 });
  }
}

/** PATCH /api/chats/[id] — update conversation title */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : null;

    if (!title) {
      return NextResponse.json({ error: "Título inválido" }, { status: 400 });
    }

    const conversation = await prisma.chatConversation.updateMany({
      where: { id, userId },
      data: { title },
    });

    if (conversation.count === 0) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/chats/[id] error:", err);
    return NextResponse.json({ error: "Erro ao atualizar conversa" }, { status: 500 });
  }
}

/** DELETE /api/chats/[id] — delete conversation (cascades messages) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await prisma.chatConversation.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/chats/[id] error:", err);
    return NextResponse.json({ error: "Erro ao deletar conversa" }, { status: 500 });
  }
}
