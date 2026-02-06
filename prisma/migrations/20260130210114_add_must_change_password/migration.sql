/*
  Warnings:

  - You are about to drop the column `clube` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_clubeId_fkey";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "clube";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "updatedAt",
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
