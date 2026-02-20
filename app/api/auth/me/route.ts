// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

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

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromReq(req);
    if (!token) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      // importante: 401 (não 404)
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        image: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      // também: 401 é melhor aqui do que 404 pro fluxo de auth
      // 404 faz cliente pensar “rota quebrada” quando na real é sessão inválida
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    // renova token
    const newToken = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    const res = NextResponse.json({ user, token: newToken });

    res.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("Erro em /api/auth/me:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
