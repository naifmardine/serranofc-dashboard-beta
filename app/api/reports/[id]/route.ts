import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/authHelper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/reports/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const report = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ report });
  } catch (err) {
    console.error("GET /api/reports/[id] error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar relatório" },
      { status: 500 }
    );
  }
}

/** PATCH /api/reports/[id] — rename report */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));

    const title =
      typeof body?.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : null;

    if (!title) {
      return NextResponse.json(
        { error: "Título é obrigatório" },
        { status: 400 }
      );
    }

    const existing = await prisma.report.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    const report = await prisma.report.update({
      where: { id },
      data: { title },
      select: {
        id: true,
        title: true,
        createdAt: true,
        conversationId: true,
      },
    });

    return NextResponse.json({ report });
  } catch (err) {
    console.error("PATCH /api/reports/[id] error:", err);
    return NextResponse.json(
      { error: "Erro ao renomear relatório" },
      { status: 500 }
    );
  }
}

/** DELETE /api/reports/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await prisma.report.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/reports/[id] error:", err);
    return NextResponse.json(
      { error: "Erro ao deletar relatório" },
      { status: 500 }
    );
  }
}