import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function upper(v: string) {
  return v.trim().toUpperCase();
}

const BaseClubSchema = z.object({
  // compat: aceita nome ou name
  nome: z.string().min(2).optional(),
  name: z.string().min(2).optional(),

  logoUrl: z.string().url().optional().or(z.literal("")),

  countryCode: z.string().optional().nullable(),
  countryName: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  stateName: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  continentCode: z.string().optional().nullable(),
});

const UpdateClubSchema = BaseClubSchema
  .refine(
    (v) => {
      const cc = v.countryCode ? upper(v.countryCode) : null;
      if (!cc) return true; // update parcial sem mexer nisso
      if (!v.countryName?.trim()) return false;
      if (cc === "BR") {
        return Boolean(v.stateCode?.trim()) && Boolean(v.stateName?.trim());
      }
      return true;
    },
    { message: "Localização inválida: BR exige stateCode/stateName e countryName.", path: ["countryCode"] }
  );

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(club);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateClubSchema.parse(body);

  const nome = (parsed.nome ?? parsed.name)?.trim();

  const hasCountry = parsed.countryCode !== undefined;
  const cc = hasCountry ? (parsed.countryCode ? upper(parsed.countryCode) : null) : undefined;

  const data: any = {};

  if (nome) data.nome = nome;

  if (parsed.logoUrl !== undefined) {
    const v = parsed.logoUrl.trim();
    data.logoUrl = v || null;
  }

  // localização (se veio no payload)
  if (hasCountry) {
    data.countryCode = cc;
    data.countryName = parsed.countryName?.trim() ? parsed.countryName.trim() : null;
    data.city = parsed.city?.trim() ? parsed.city.trim() : null;
    data.continentCode = parsed.continentCode?.trim() ? upper(parsed.continentCode) : null;

    if (cc === "BR") {
      data.stateCode = parsed.stateCode?.trim() ? upper(parsed.stateCode) : null;
      data.stateName = parsed.stateName?.trim() ? parsed.stateName.trim() : null;
    } else {
      // fora do BR, zera pra evitar lixo
      data.stateCode = null;
      data.stateName = null;
    }
  }

  const club = await prisma.club.update({
    where: { id },
    data,
  });

  return NextResponse.json(club);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.club.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
