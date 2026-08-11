-- CreateEnum
CREATE TYPE "EstadoMantenimiento" AS ENUM ('EN_PROCESO', 'FINALIZADO');

-- CreateTable
CREATE TABLE "mantenimientos" (
    "id" SERIAL NOT NULL,
    "unidad_id" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "kilometraje" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoMantenimiento" NOT NULL DEFAULT 'EN_PROCESO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mantenimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mantenimientos_unidad_id_idx" ON "mantenimientos"("unidad_id");

-- CreateIndex
CREATE INDEX "mantenimientos_estado_idx" ON "mantenimientos"("estado");

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
