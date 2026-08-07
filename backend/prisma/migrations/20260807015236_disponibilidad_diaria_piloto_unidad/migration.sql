/*
  Warnings:

  - A unique constraint covering the columns `[piloto_id,fecha]` on the table `registros_diarios` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[unidad_id,fecha]` on the table `registros_diarios` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "uq_registros_diarios_piloto_fecha" ON "registros_diarios"("piloto_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "uq_registros_diarios_unidad_fecha" ON "registros_diarios"("unidad_id", "fecha");
