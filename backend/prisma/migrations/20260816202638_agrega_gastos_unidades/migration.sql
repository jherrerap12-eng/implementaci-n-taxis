-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('REPUESTOS_MENORES', 'PINCHAZO');

-- CreateTable
CREATE TABLE "gastos" (
    "id" SERIAL NOT NULL,
    "unidad_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoGasto" NOT NULL,
    "descripcion" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gastos_unidad_id_idx" ON "gastos"("unidad_id");

-- CreateIndex
CREATE INDEX "gastos_fecha_idx" ON "gastos"("fecha");

-- CreateIndex
CREATE INDEX "gastos_tipo_idx" ON "gastos"("tipo");

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
