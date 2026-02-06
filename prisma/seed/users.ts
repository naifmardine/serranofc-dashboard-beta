// prisma/seed/users.ts
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "../../lib/prisma";

export async function seedUsers() {
  console.log("🌱 Seeding users...");

  // Hash das senhas
  const adminPassword = await hash("admin@2025", 10);
  const clientPassword = await hash("cliente@2025", 10);

  // Apagar usuários existentes (opcional, para idempotência)
  await prisma.user.deleteMany();

  // Criar admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin Serrano",
      email: "admin@serrano.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      image: null,
    },
  });

  console.log("✅ Admin criado:", admin.email);

  // Criar cliente
  const client = await prisma.user.create({
    data: {
      name: "Cliente Serrano",
      email: "cliente@serrano.com",
      passwordHash: clientPassword,
      role: Role.CLIENT,
      image: null,
    },
  });

  console.log("✅ Cliente criado:", client.email);

  return { admin, client };
}
