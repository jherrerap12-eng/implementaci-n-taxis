-- CreateEnum
CREATE TYPE "TipoMovimientoAhorro" AS ENUM ('APORTE_DIARIO', 'RETIRO', 'AJUSTE_INGRESO', 'AJUSTE_EGRESO');

-- CreateTable
CREATE TABLE "movimientos_ahorro_pilotos" (
    "id" SERIAL NOT NULL,
    "piloto_id" INTEGER NOT NULL,
    "registro_diario_id" INTEGER,
    "tipo" "TipoMovimientoAhorro" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_ahorro_pilotos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_movimientos_ahorro_monto_positivo" CHECK ("monto" > 0),
    CONSTRAINT "chk_movimientos_ahorro_origen_coherente" CHECK (
        ("tipo" = 'APORTE_DIARIO' AND "registro_diario_id" IS NOT NULL) OR
        ("tipo" <> 'APORTE_DIARIO' AND "registro_diario_id" IS NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_movimientos_ahorro_registro_diario" ON "movimientos_ahorro_pilotos"("registro_diario_id");

-- CreateIndex
CREATE INDEX "movimientos_ahorro_pilotos_piloto_id_creado_en_idx" ON "movimientos_ahorro_pilotos"("piloto_id", "creado_en");

-- CreateIndex
CREATE INDEX "movimientos_ahorro_pilotos_tipo_idx" ON "movimientos_ahorro_pilotos"("tipo");

-- AddForeignKey
ALTER TABLE "movimientos_ahorro_pilotos" ADD CONSTRAINT "movimientos_ahorro_pilotos_piloto_id_fkey" FOREIGN KEY ("piloto_id") REFERENCES "pilotos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_ahorro_pilotos" ADD CONSTRAINT "movimientos_ahorro_pilotos_registro_diario_id_fkey" FOREIGN KEY ("registro_diario_id") REFERENCES "registros_diarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
