-- DropIndex
DROP INDEX "cargas_combustible_registro_diario_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "uq_cargas_combustible_registro_diario" ON "cargas_combustible"("registro_diario_id");
