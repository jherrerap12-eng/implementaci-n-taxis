-- CreateEnum
CREATE TYPE "ModoInstalacionComponente" AS ENUM ('INDIVIDUAL', 'POSICIONADO');

-- AlterTable
ALTER TABLE "catalogo_componentes" ADD COLUMN     "modo_instalacion" "ModoInstalacionComponente" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "componentes_unidad" ADD COLUMN     "posicion_catalogo_id" INTEGER;

-- CreateTable
CREATE TABLE "posiciones_catalogo_componentes" (
    "id" SERIAL NOT NULL,
    "catalogo_componente_id" INTEGER NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posiciones_catalogo_componentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posiciones_catalogo_componentes_catalogo_componente_id_acti_idx" ON "posiciones_catalogo_componentes"("catalogo_componente_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_posiciones_catalogo_componente_codigo" ON "posiciones_catalogo_componentes"("catalogo_componente_id", "codigo");

-- CreateIndex
CREATE INDEX "componentes_unidad_posicion_catalogo_id_idx" ON "componentes_unidad"("posicion_catalogo_id");

-- Impide ocupar dos veces una posición configurada del mismo componente en una unidad.
CREATE UNIQUE INDEX "uq_componentes_unidad_instalado_posicion_catalogo"
ON "componentes_unidad" ("unidad_id", "catalogo_componente_id", "posicion_catalogo_id")
WHERE "estado" = 'INSTALADO' AND "posicion_catalogo_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "posiciones_catalogo_componentes" ADD CONSTRAINT "posiciones_catalogo_componentes_catalogo_componente_id_fkey" FOREIGN KEY ("catalogo_componente_id") REFERENCES "catalogo_componentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_unidad" ADD CONSTRAINT "componentes_unidad_posicion_catalogo_id_fkey" FOREIGN KEY ("posicion_catalogo_id") REFERENCES "posiciones_catalogo_componentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
