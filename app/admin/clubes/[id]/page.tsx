import { prisma } from "@/lib/prisma";
import CRUDClub from "@/components/Atoms/CRUDClub";
import { notFound } from "next/navigation";

export default async function EditarClubePage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  if (!id) return notFound();

  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      logoUrl: true,
      countryCode: true,
      countryName: true,
      stateCode: true,
      stateName: true,
      city: true,
      continentCode: true,
    },
  });

  if (!club) return notFound();

  return (
    <CRUDClub
      mode="edit"
      clubId={club.id}
      initial={{
        nome: club.nome ?? "",
        logoUrl: club.logoUrl ?? "",
        countryCode: club.countryCode ?? "BR",
        countryName: club.countryName ?? (club.countryCode === "BR" ? "Brasil" : ""),
        continentCode: club.continentCode ?? "",
        stateCode: club.stateCode ?? "",
        stateName: club.stateName ?? "",
        city: club.city ?? "",
      }}
    />
  );
}
