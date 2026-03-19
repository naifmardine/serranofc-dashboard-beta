import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/authHelper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/chats — list user's conversations (newest first) */
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const conversations = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("GET /api/chats error:", err);
    return NextResponse.json({ error: "Erro ao buscar conversas" }, { status: 500 });
  }
}

/** POST /api/chats — create a new conversation */
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : "Nova conversa";

    const conversation = await prisma.chatConversation.create({
      data: { userId, title },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    console.error("POST /api/chats error:", err);
    return NextResponse.json({ error: "Erro ao criar conversa" }, { status: 500 });
  }
}
