-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "clubeId" TEXT;

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Player_clubeId_idx" ON "Player"("clubeId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
