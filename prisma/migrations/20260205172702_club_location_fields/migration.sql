-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "city" TEXT,
ADD COLUMN     "continentCode" TEXT,
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "countryName" TEXT,
ADD COLUMN     "stateCode" TEXT,
ADD COLUMN     "stateName" TEXT;

-- CreateIndex
CREATE INDEX "Club_countryCode_idx" ON "Club"("countryCode");

-- CreateIndex
CREATE INDEX "Club_stateCode_idx" ON "Club"("stateCode");

-- CreateIndex
CREATE INDEX "Club_continentCode_idx" ON "Club"("continentCode");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_clubeId_fkey" FOREIGN KEY ("clubeId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
