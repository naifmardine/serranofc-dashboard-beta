import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPlayerToJogador } from "@/lib/mapPlayerToJogador";
import type { Jogador } from "@/type/jogador";

export const dynamic = "force-dynamic";

type ClubLite = { id: string; nome: string; logoUrl: string | null };

export async function GET() {
  try {
    // 1) Busca jogadores sem relations
    const players = await prisma.player.findMany({
      orderBy: { nome: "asc" },
    });

    // 2) Coleta clubeIds
    const clubeIds = Array.from(
      new Set(players.map((p) => p.clubeId).filter((x): x is string => !!x))
    );

    // 3) Busca clubes em batch (inclui logoUrl)
    const clubs: ClubLite[] = clubeIds.length
      ? await prisma.club.findMany({
          where: { id: { in: clubeIds } },
          select: { id: true, nome: true, logoUrl: true },
        })
      : [];

    const clubById = new Map<string, ClubLite>(clubs.map((c) => [c.id, c]));

    // 4) Mapeia jogadores com clubObj (nome + logo)
    const jogadores: Jogador[] = players.map((p) => {
      const club = p.clubeId ? clubById.get(p.clubeId) ?? null : null;
      return mapPlayerToJogador(p, club);
    });

    return NextResponse.json({ jogadores });
  } catch (err) {
    console.error("Erro ao buscar jogadores:", err);
    return NextResponse.json(
      { error: "Erro ao buscar jogadores" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nome = String(body?.nome ?? "").trim();
    if (!nome) {
      return NextResponse.json(
        { error: "Preencha o nome do jogador." },
        { status: 400 }
      );
    }

    // ✅ clube via ID
    const clubeId = body?.clubeId ? String(body.clubeId) : null;

    // valida clubeId (se enviado) e já pega nome+logo
    let club: ClubLite | null = null;
    if (clubeId) {
      club = await prisma.club.findUnique({
        where: { id: clubeId },
        select: { id: true, nome: true, logoUrl: true },
      });

      if (!club) {
        return NextResponse.json(
          { error: "clubeId inválido (clube não existe)." },
          { status: 400 }
        );
      }
    }

    const data: any = {
      nome,
      idade: body?.idade ?? 0,
      posicao: body?.posicao ?? "ATA",
      peDominante: body?.peDominante ?? "D",
      valorMercado: body?.valorMercado ?? 0,
      possePct: body?.possePct ?? null,
      representacao: body?.representacao ?? null,
      situacao: body?.situacao ?? null,
      numeroCamisa: body?.numeroCamisa ?? null,
      altura: body?.altura ?? null,
      imagemUrl: body?.imagemUrl ?? null,

      // ✅ único campo de clube
      clubeId,

      // estruturas
      statsPorTemporada: body?.statsPorTemporada ?? null,
      passaporte: body?.passaporte ?? null,
      selecao: body?.selecao ?? null,

      // mídia
      instagramHandle: body?.instagramHandle ?? null,
      instagramPosts: body?.instagramPosts ?? null,
      xUrl: body?.xUrl ?? null,
      youtubeUrl: body?.youtubeUrl ?? null,
      videoUrl: body?.videoUrl ?? null,

      // complementares
      anoNascimento: body?.anoNascimento ?? null,
      cidade: body?.cidade ?? null,
      nacionalidade: body?.nacionalidade ?? null,
      racionalProspecao: body?.racionalProspecao ?? null,
      observacoes: body?.observacoes ?? null,
    };

    const created = await prisma.player.create({ data });

    return NextResponse.json(
      { jogador: mapPlayerToJogador(created, club) },
      { status: 201 }
    );
  } catch (err) {
    console.error("Erro ao criar jogador:", err);
    return NextResponse.json(
      { error: "Erro ao criar jogador" },
      { status: 500 }
    );
  }
}
