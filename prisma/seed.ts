// prisma/seed.ts
import { seedTransferencias } from "./seed/transferencias";
import { seedUsers } from "./seed/users";

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
