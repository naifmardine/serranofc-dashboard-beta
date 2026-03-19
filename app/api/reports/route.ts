import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/authHelper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/reports — list user's reports (newest first) */
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        conversationId: true,
      },
    });

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar relatórios" },
      { status: 500 }
    );
  }
}

/** POST /api/reports — create a new report */
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const title =
      typeof body?.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : null;

    const content =
      typeof body?.content === "string" && body.content.trim()
        ? body.content.trim()
        : null;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Título e conteúdo são obrigatórios" },
        { status: 400 }
      );
    }

    const conversationId =
      typeof body?.conversationId === "string" ? body.conversationId : undefined;

    if (conversationId) {
      const conv = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });

      if (!conv) {
        return NextResponse.json(
          { error: "Conversa não encontrada" },
          { status: 404 }
        );
      }
    }

    const report = await prisma.report.create({
      data: {
        title,
        content,
        userId,
        conversationId: conversationId ?? null,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json(
      { error: "Erro ao criar relatório" },
      { status: 500 }
    );
  }
}