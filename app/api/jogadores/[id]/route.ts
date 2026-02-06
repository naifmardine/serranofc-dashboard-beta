import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPlayerToJogador } from "@/lib/mapPlayerToJogador";

export const dynamic = "force-dynamic";

/* =========================
   Helpers
========================= */

async function getClubLite(clubeId?: string | null) {
  if (!clubeId) return null;
  return prisma.club.findUnique({
    where: { id: clubeId },
    select: { id: true, nome: true, logoUrl: true },
  });
}

/* =========================
   GET /api/jogadores/:id
========================= */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const jogador = await prisma.player.findUnique({ where: { id } });

    if (!jogador) {
      return NextResponse.json(
        { error: "Jogador não encontrado" },
        { status: 404 }
      );
    }

    const club = await getClubLite(jogador.clubeId);

    return NextResponse.json({
      jogador: mapPlayerToJogador(jogador, club),
    });
  } catch (err) {
    console.error("[API /jogadores/[id]] - ERRO NO PRISMA (GET)", err);
    return NextResponse.json(
      { error: "Erro interno ao buscar jogador" },
      { status: 500 }
    );
  }
}

/* ============================
   PATCH /api/jogadores/:id
============================ */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));

    // ✅ contrato atual: sem "clube" (string) e sem "variacaoPct"
    const {
      nome,
      idade,
      posicao,
      valorMercado,
      peDominante,

      representacao,
      numeroCamisa,
      imagemUrl,
      altura,
      situacao,
      possePct,

      anoNascimento,
      cidade,
      nacionalidade,

      dataTransferencia,
      parceria,
      empresario,
      percPrimeiraOpcao,
      valorPrimeiraOpcao,
      prazoPrimeiraOpcao,
      percSegundaOpcao,
      valorSegundaOpcao,
      prazoSegundaOpcao,
      observacoes,
      qtdTransfRef,
      idadeTransfRef,
      valorTransfRef,
      direitosSerrano,
      tempoAteIdadeVenda,
      racionalProspecao,
      valorProsp,
      comissao,

      instagramHandle,
      instagramPosts,
      xUrl,
      youtubeUrl,
      videoUrl,

      passaporte,
      selecao,
      statsPorTemporada,

      // ✅ FK do clube
      clubeId,
    } = body ?? {};

    const data: any = {
      ...(nome !== undefined && { nome }),
      ...(idade !== undefined && { idade }),
      ...(posicao !== undefined && { posicao }),
      ...(valorMercado !== undefined && { valorMercado }),
      ...(peDominante !== undefined && { peDominante }),

      ...(representacao !== undefined && { representacao }),
      ...(numeroCamisa !== undefined && { numeroCamisa }),
      ...(imagemUrl !== undefined && { imagemUrl }),
      ...(altura !== undefined && { altura }),
      ...(situacao !== undefined && { situacao }),
      ...(possePct !== undefined && { possePct }),

      ...(anoNascimento !== undefined && { anoNascimento }),
      ...(cidade !== undefined && { cidade }),
      ...(nacionalidade !== undefined && { nacionalidade }),

      ...(dataTransferencia !== undefined && { dataTransferencia }),
      ...(parceria !== undefined && { parceria }),
      ...(empresario !== undefined && { empresario }),
      ...(percPrimeiraOpcao !== undefined && { percPrimeiraOpcao }),
      ...(valorPrimeiraOpcao !== undefined && { valorPrimeiraOpcao }),
      ...(prazoPrimeiraOpcao !== undefined && { prazoPrimeiraOpcao }),
      ...(percSegundaOpcao !== undefined && { percSegundaOpcao }),
      ...(valorSegundaOpcao !== undefined && { valorSegundaOpcao }),
      ...(prazoSegundaOpcao !== undefined && { prazoSegundaOpcao }),
      ...(observacoes !== undefined && { observacoes }),
      ...(qtdTransfRef !== undefined && { qtdTransfRef }),
      ...(idadeTransfRef !== undefined && { idadeTransfRef }),
      ...(valorTransfRef !== undefined && { valorTransfRef }),
      ...(direitosSerrano !== undefined && { direitosSerrano }),
      ...(tempoAteIdadeVenda !== undefined && { tempoAteIdadeVenda }),
      ...(racionalProspecao !== undefined && { racionalProspecao }),
      ...(valorProsp !== undefined && { valorProsp }),
      ...(comissao !== undefined && { comissao }),

      ...(instagramHandle !== undefined && { instagramHandle }),
      ...(instagramPosts !== undefined && { instagramPosts }),
      ...(xUrl !== undefined && { xUrl }),
      ...(youtubeUrl !== undefined && { youtubeUrl }),
      ...(videoUrl !== undefined && { videoUrl }),

      ...(passaporte !== undefined && { passaporte }),
      ...(selecao !== undefined && { selecao }),
      ...(statsPorTemporada !== undefined && { statsPorTemporada }),
    };

    // ✅ aplica clubeId (com validação)
    if (clubeId !== undefined) {
      const nextClubeId = clubeId ? String(clubeId) : null;

      if (nextClubeId) {
        const exists = await prisma.club.findUnique({
          where: { id: nextClubeId },
          select: { id: true },
        });
        if (!exists) {
          return NextResponse.json(
            { error: "clubeId inválido (clube não existe)." },
            { status: 400 }
          );
        }
      }

      data.clubeId = nextClubeId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const updated = await prisma.player.update({
      where: { id },
      data,
    });

    const club = await getClubLite(updated.clubeId);

    return NextResponse.json({
      jogador: mapPlayerToJogador(updated, club),
    });
  } catch (err) {
    console.error("[API /jogadores/[id]] - ERRO NO PRISMA (PATCH)", err);
    return NextResponse.json(
      { error: "Erro interno ao atualizar jogador" },
      { status: 500 }
    );
  }
}

/* ============================
   DELETE /api/jogadores/:id
============================ */
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const exists = await prisma.player.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { error: "Jogador não encontrado" },
        { status: 404 }
      );
    }

    await prisma.player.delete({ where: { id } });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error("[API /jogadores/[id]] - ERRO NO PRISMA (DELETE)", err);
    return NextResponse.json(
      { error: "Erro interno ao deletar jogador" },
      { status: 500 }
    );
  }
}
