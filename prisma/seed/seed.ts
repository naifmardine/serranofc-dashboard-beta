// prisma/seed.ts
import { seedTransferencias } from "./transferencias";
import { seedUsers } from "./users";

async function main() {
  await seedUsers();
  await seedTransferencias();
}

main()
  .then(() => {
    console.log("🌱 Seed finalizado.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  });
