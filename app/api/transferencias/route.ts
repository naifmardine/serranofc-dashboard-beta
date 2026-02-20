import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(
      100,
      Math.max(10, Number(searchParams.get("pageSize") ?? "25")),
    );

    const q = (searchParams.get("q") ?? "").trim();
    const pos = (searchParams.get("pos") ?? "").trim();
    const pais = (searchParams.get("pais") ?? "").trim();

    const where: any = {};

    if (q) {
      where.OR = [
        { atletaNome: { contains: q, mode: "insensitive" } },
        { clubeDestino: { contains: q, mode: "insensitive" } },
        { clubeOrigem: { contains: q, mode: "insensitive" } },
        { clubeFormador: { contains: q, mode: "insensitive" } },
      ];
    }

    if (pos) where.atletaPosicao = { equals: pos, mode: "insensitive" };
    if (pais) where.paisClubeDestino = { contains: pais, mode: "insensitive" };

    const [total, rows] = await Promise.all([
      prisma.transferencia.count({ where }),
      prisma.transferencia.findMany({
        where,
        orderBy: [{ dataTransferencia: "desc" }, { atletaNome: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          atletaNome: true,
          atletaIdade: true,
          atletaPosicao: true,
          clubeFormador: true,
          clubeOrigem: true,
          clubeDestino: true,
          paisClubeDestino: true,
          dataTransferencia: true,
          valor: true,
        },
      }),
    ]);

    // Nota: valor (Decimal) pode vir como objeto dependendo do runtime; Next JSON lida,
    // mas seu front já trata como string/number. Se quiser padronizar depois, a gente normaliza aqui.

    return NextResponse.json({ page, pageSize, total, rows });
  } catch (err: any) {
    console.error("❌ API /transferencias GET:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro interno" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/transferencias
 * body: { ids: string[] }
 * Deleta em lote as transferências pelos IDs (seleção via checkbox).
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const ids: unknown = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Envie { ids: string[] } com pelo menos 1 id." },
        { status: 400 },
      );
    }

    // valida + limita pra evitar abuso sem querer
    const clean = ids
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);

    if (clean.length === 0) {
      return NextResponse.json(
        { error: "IDs inválidos." },
        { status: 400 },
      );
    }

    if (clean.length > 500) {
      return NextResponse.json(
        { error: "Máximo de 500 itens por deleção em lote." },
        { status: 400 },
      );
    }

    const res = await prisma.transferencia.deleteMany({
      where: { id: { in: clean } },
    });

    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (err: any) {
    console.error("❌ API /transferencias DELETE:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro interno" },
      { status: 500 },
    );
  }
}
