-- CreateEnum
CREATE TYPE "EstadoPiloto" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoUnidad" AS ENUM ('DISPONIBLE', 'EN_RUTA', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "TipoCombustible" AS ENUM ('GASOLINA', 'DIESEL');

-- CreateTable
CREATE TABLE "pilotos" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(20),
    "numero_licencia" VARCHAR(50) NOT NULL,
    "vencimiento_licencia" DATE NOT NULL,
    "estado" "EstadoPiloto" NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" SERIAL NOT NULL,
    "numero_unidad" VARCHAR(20) NOT NULL,
    "placa" VARCHAR(20) NOT NULL,
    "marca" VARCHAR(50) NOT NULL,
    "modelo" VARCHAR(50) NOT NULL,
    "anio" INTEGER NOT NULL,
    "tipo_combustible" "TipoCombustible" NOT NULL,
    "kilometraje_actual" INTEGER NOT NULL,
    "estado" "EstadoUnidad" NOT NULL DEFAULT 'DISPONIBLE',
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pilotos_codigo_key" ON "pilotos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pilotos_numero_licencia_key" ON "pilotos"("numero_licencia");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_numero_unidad_key" ON "unidades"("numero_unidad");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_placa_key" ON "unidades"("placa");
