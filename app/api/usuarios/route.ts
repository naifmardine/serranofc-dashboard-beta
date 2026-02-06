// app/api/usuarios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_prod";

function extractToken(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1] || null;
}

function verifyToken(token: string): { sub: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
  } catch {
    return null;
  }
}

function getAuth(req: NextRequest) {
  const token = extractToken(
    req.headers.get("authorization") || req.cookies.get("sfc_token")?.value
  );

  if (!token) return { token: null, decoded: null };

  const decoded = verifyToken(token);
  return { token, decoded };
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  image: true,
  mustChangePassword: true,
};

// GET /api/usuarios - listar usuários (apenas admin)
export async function GET(req: NextRequest) {
  try {
    const { decoded } = getAuth(req);

    if (!decoded) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error("Erro em GET /api/usuarios:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/usuarios - criar usuário (apenas admin)
export async function POST(req: NextRequest) {
  try {
    const { decoded } = getAuth(req);

    if (!decoded) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const schema = z.object({
      name: z.string().min(1, "Nome obrigatório"),
      email: z.string().email("Email inválido"),
      password: z.string().min(6, "Senha inválida"),
      role: z.enum(["ADMIN", "CLIENT"]),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const name = parsed.data.name.trim();
    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const role = parsed.data.role;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email já registrado" }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        mustChangePassword: true,
      },
      select: userSelect,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("Erro em POST /api/usuarios:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT /api/usuarios - atualizar perfil do usuário logado (ou outro se ADMIN)
export async function PUT(req: NextRequest) {
  try {
    const { decoded } = getAuth(req);

    if (!decoded) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const schema = z.object({
      id: z.string().optional(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const targetUserId = parsed.data.id || decoded.sub;

    if (targetUserId !== decoded.sub && decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const nextData: { name?: string; email?: string } = {};

    if (parsed.data.name !== undefined) nextData.name = parsed.data.name.trim();

    if (parsed.data.email !== undefined) {
      const nextEmail = parsed.data.email.trim().toLowerCase();

      // evita conflito com outro usuário
      const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (existing && existing.id !== targetUserId) {
        return NextResponse.json({ error: "Email já registrado" }, { status: 400 });
      }

      nextData.email = nextEmail;
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: nextData,
      select: userSelect,
    });

    return NextResponse.json(user);
  } catch (err: any) {
    console.error("Erro em PUT /api/usuarios:", err);

    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/usuarios - deletar usuário (apenas admin)
export async function DELETE(req: NextRequest) {
  try {
    const { decoded } = getAuth(req);

    if (!decoded) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const schema = z.object({ id: z.string().min(1) });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: parsed.data.id } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erro em DELETE /api/usuarios:", err);

    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
