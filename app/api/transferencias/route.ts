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
      }),
    ]);

    return NextResponse.json({ page, pageSize, total, rows });
  } catch (err: any) {
    console.error("❌ API /transferencias:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro interno" },
      { status: 500 },
    );
  }
}
