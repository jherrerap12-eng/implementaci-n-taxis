-- CreateEnum
CREATE TYPE "EstadoRegistroDiario" AS ENUM ('PENDIENTE_COMBUSTIBLE', 'COMPLETADO');

-- CreateTable
CREATE TABLE "registros_diarios" (
    "id" SERIAL NOT NULL,
    "piloto_id" INTEGER NOT NULL,
    "unidad_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "kilometraje_inicial" INTEGER NOT NULL,
    "kilometraje_final" INTEGER NOT NULL,
    "monto_liquidado" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoRegistroDiario" NOT NULL DEFAULT 'PENDIENTE_COMBUSTIBLE',
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_diarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargas_combustible" (
    "id" SERIAL NOT NULL,
    "registro_diario_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "galones" DECIMAL(10,3) NOT NULL,
    "precio_galon" DECIMAL(10,2) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargas_combustible_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registros_diarios_fecha_idx" ON "registros_diarios"("fecha");

-- CreateIndex
CREATE INDEX "registros_diarios_piloto_id_idx" ON "registros_diarios"("piloto_id");

-- CreateIndex
CREATE INDEX "registros_diarios_unidad_id_idx" ON "registros_diarios"("unidad_id");

-- CreateIndex
CREATE INDEX "cargas_combustible_registro_diario_id_idx" ON "cargas_combustible"("registro_diario_id");

-- AddForeignKey
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_piloto_id_fkey" FOREIGN KEY ("piloto_id") REFERENCES "pilotos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargas_combustible" ADD CONSTRAINT "cargas_combustible_registro_diario_id_fkey" FOREIGN KEY ("registro_diario_id") REFERENCES "registros_diarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
