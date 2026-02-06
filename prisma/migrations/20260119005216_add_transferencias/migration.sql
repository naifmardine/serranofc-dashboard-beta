-- CreateTable
CREATE TABLE "Transferencia" (
    "id" TEXT NOT NULL,
    "atletaNome" TEXT NOT NULL,
    "atletaIdade" INTEGER,
    "atletaPosicao" TEXT,
    "clubeFormador" TEXT,
    "cidadeClubeFormador" TEXT,
    "paisClubeFormador" TEXT,
    "clubeOrigem" TEXT,
    "clubeDestino" TEXT,
    "cidadeClubeDestino" TEXT,
    "paisClubeDestino" TEXT,
    "dataTransferencia" TIMESTAMP(3),
    "valor" DECIMAL(14,2),
    "moeda" TEXT,
    "fonte" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transferencia_atletaNome_idx" ON "Transferencia"("atletaNome");

-- CreateIndex
CREATE INDEX "Transferencia_atletaPosicao_idx" ON "Transferencia"("atletaPosicao");

-- CreateIndex
CREATE INDEX "Transferencia_dataTransferencia_idx" ON "Transferencia"("dataTransferencia");

-- CreateIndex
CREATE INDEX "Transferencia_paisClubeDestino_idx" ON "Transferencia"("paisClubeDestino");
