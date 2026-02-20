// app/api/usuarios/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { compare, hash } from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_prod";
const COOKIE_NAME = "sfc_token";

type Decoded = { sub: string; role: "ADMIN" | "CLIENT" };

function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1] ?? null;
}

function getTokenFromReq(req: NextRequest): string | null {
  const bearer = extractBearerToken(req.headers.get("authorization"));
  if (bearer) return bearer;
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

function verifyToken(token: string): Decoded | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const sub = typeof payload?.sub === "string" ? payload.sub : null;
    const role = payload?.role === "ADMIN" || payload?.role === "CLIENT" ? payload.role : null;
    if (!sub || !role) return null;
    return { sub, role };
  } catch {
    return null;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getTokenFromReq(req);
    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const schema = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(10),
        confirmNewPassword: z.string().min(10),
      })
      .refine((d) => d.newPassword === d.confirmNewPassword, {
        message: "As senhas não coincidem",
        path: ["confirmNewPassword"],
      });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "A nova senha precisa ser diferente da atual" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const ok = await compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }

    const newHash = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: decoded.sub },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro em PUT /api/usuarios/change-password:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
