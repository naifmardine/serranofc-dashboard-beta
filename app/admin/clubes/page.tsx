import { prisma } from "@/lib/prisma";
import ClubesClient from "./ui/clubes-client";

export default async function ClubesPage() {
  const clubs = await prisma.club.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      slug: true,
      logoUrl: true,
      createdAt: true,
      countryCode: true,
      stateCode: true,
      continentCode: true,
    },
  });

  const data = clubs.map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    logoUrl: c.logoUrl,
    createdAt: c.createdAt.toLocaleDateString("pt-BR"),
    countryCode: c.countryCode,
    stateCode: c.stateCode,
    continentCode: c.continentCode,
  }));

  return <ClubesClient initialClubs={data} />;
}
