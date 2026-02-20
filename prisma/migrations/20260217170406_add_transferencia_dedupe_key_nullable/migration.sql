/*
  Warnings:

  - A unique constraint covering the columns `[dedupeKey]` on the table `Transferencia` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transferencia" ADD COLUMN     "dedupeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_dedupeKey_key" ON "Transferencia"("dedupeKey");
