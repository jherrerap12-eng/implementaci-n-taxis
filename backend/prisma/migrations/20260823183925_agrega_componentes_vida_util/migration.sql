-- CreateEnum
CREATE TYPE "EstadoComponenteUnidad" AS ENUM ('INSTALADO', 'RETIRADO');

-- CreateEnum
CREATE TYPE "AccionMantenimientoComponente" AS ENUM ('INSPECCION', 'MANTENIMIENTO', 'INSTALACION', 'RETIRO', 'REEMPLAZO');

-- CreateTable
CREATE TABLE "catalogo_componentes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "vida_util_meses_default" INTEGER,
    "vida_util_km_default" INTEGER,
    "alerta_dias_antes_default" INTEGER NOT NULL DEFAULT 30,
    "alerta_km_antes_default" INTEGER NOT NULL DEFAULT 500,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_componentes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_catalogo_componentes_vida_util_configurada" CHECK (
        "vida_util_meses_default" IS NOT NULL OR
        "vida_util_km_default" IS NOT NULL
    ),
    CONSTRAINT "chk_catalogo_componentes_vida_util_meses_positiva" CHECK (
        "vida_util_meses_default" IS NULL OR
        "vida_util_meses_default" > 0
    ),
    CONSTRAINT "chk_catalogo_componentes_vida_util_km_positiva" CHECK (
        "vida_util_km_default" IS NULL OR
        "vida_util_km_default" > 0
    ),
    CONSTRAINT "chk_catalogo_componentes_umbral_dias_no_negativo" CHECK (
        "alerta_dias_antes_default" >= 0
    ),
    CONSTRAINT "chk_catalogo_componentes_umbral_km_no_negativo" CHECK (
        "alerta_km_antes_default" >= 0
    )
);

-- CreateTable
CREATE TABLE "componentes_unidad" (
    "id" SERIAL NOT NULL,
    "unidad_id" INTEGER NOT NULL,
    "catalogo_componente_id" INTEGER NOT NULL,
    "marca" VARCHAR(100),
    "modelo" VARCHAR(100),
    "numero_serie" VARCHAR(120),
    "posicion" VARCHAR(80),
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "fecha_instalacion" DATE NOT NULL,
    "kilometraje_instalacion" INTEGER NOT NULL,
    "vida_util_meses" INTEGER,
    "vida_util_km" INTEGER,
    "alerta_dias_antes" INTEGER NOT NULL DEFAULT 30,
    "alerta_km_antes" INTEGER NOT NULL DEFAULT 500,
    "estado" "EstadoComponenteUnidad" NOT NULL DEFAULT 'INSTALADO',
    "fecha_retiro" DATE,
    "kilometraje_retiro" INTEGER,
    "motivo_retiro" TEXT,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "componentes_unidad_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_componentes_unidad_cantidad_positiva" CHECK (
        "cantidad" > 0
    ),
    CONSTRAINT "chk_componentes_unidad_km_instalacion_no_negativo" CHECK (
        "kilometraje_instalacion" >= 0
    ),
    CONSTRAINT "chk_componentes_unidad_vida_util_configurada" CHECK (
        "vida_util_meses" IS NOT NULL OR
        "vida_util_km" IS NOT NULL
    ),
    CONSTRAINT "chk_componentes_unidad_vida_util_meses_positiva" CHECK (
        "vida_util_meses" IS NULL OR
        "vida_util_meses" > 0
    ),
    CONSTRAINT "chk_componentes_unidad_vida_util_km_positiva" CHECK (
        "vida_util_km" IS NULL OR
        "vida_util_km" > 0
    ),
    CONSTRAINT "chk_componentes_unidad_umbral_dias_no_negativo" CHECK (
        "alerta_dias_antes" >= 0
    ),
    CONSTRAINT "chk_componentes_unidad_umbral_km_no_negativo" CHECK (
        "alerta_km_antes" >= 0
    ),
    CONSTRAINT "chk_componentes_unidad_estado_retiro_coherente" CHECK (
        (
            "estado" = 'INSTALADO' AND
            "fecha_retiro" IS NULL AND
            "kilometraje_retiro" IS NULL
        ) OR (
            "estado" = 'RETIRADO' AND
            "fecha_retiro" IS NOT NULL AND
            "kilometraje_retiro" IS NOT NULL
        )
    ),
    CONSTRAINT "chk_componentes_unidad_fecha_retiro_valida" CHECK (
        "fecha_retiro" IS NULL OR
        "fecha_retiro" >= "fecha_instalacion"
    ),
    CONSTRAINT "chk_componentes_unidad_km_retiro_valido" CHECK (
        "kilometraje_retiro" IS NULL OR
        "kilometraje_retiro" >= "kilometraje_instalacion"
    )
);

-- CreateTable
CREATE TABLE "mantenimientos_componentes" (
    "id" SERIAL NOT NULL,
    "mantenimiento_id" INTEGER NOT NULL,
    "componente_unidad_id" INTEGER NOT NULL,
    "accion" "AccionMantenimientoComponente" NOT NULL,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mantenimientos_componentes_pkey" PRIMARY KEY ("id")
);

-- Impide nombres duplicados ignorando mayúsculas, minúsculas y espacios externos.
CREATE UNIQUE INDEX "uq_catalogo_componentes_nombre_normalizado"
ON "catalogo_componentes" (UPPER(BTRIM("nombre")));

-- CreateIndex
CREATE INDEX "catalogo_componentes_activo_idx" ON "catalogo_componentes"("activo");

-- CreateIndex
CREATE INDEX "componentes_unidad_unidad_id_estado_idx" ON "componentes_unidad"("unidad_id", "estado");

-- CreateIndex
CREATE INDEX "componentes_unidad_catalogo_componente_id_idx" ON "componentes_unidad"("catalogo_componente_id");

-- CreateIndex
CREATE INDEX "componentes_unidad_fecha_instalacion_idx" ON "componentes_unidad"("fecha_instalacion");

-- Impide más de un componente instalado del mismo tipo y posición por unidad.
-- Las posiciones se comparan sin espacios externos y sin distinguir mayúsculas.
CREATE UNIQUE INDEX "uq_componentes_unidad_instalado_posicion"
ON "componentes_unidad" (
    "unidad_id",
    "catalogo_componente_id",
    COALESCE(NULLIF(UPPER(BTRIM("posicion")), ''), 'GENERAL')
)
WHERE "estado" = 'INSTALADO';

-- CreateIndex
CREATE INDEX "mantenimientos_componentes_mantenimiento_id_idx" ON "mantenimientos_componentes"("mantenimiento_id");

-- CreateIndex
CREATE INDEX "mantenimientos_componentes_componente_unidad_id_idx" ON "mantenimientos_componentes"("componente_unidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mantenimientos_componentes_accion" ON "mantenimientos_componentes"("mantenimiento_id", "componente_unidad_id", "accion");

-- AddForeignKey
ALTER TABLE "componentes_unidad" ADD CONSTRAINT "componentes_unidad_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_unidad" ADD CONSTRAINT "componentes_unidad_catalogo_componente_id_fkey" FOREIGN KEY ("catalogo_componente_id") REFERENCES "catalogo_componentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos_componentes" ADD CONSTRAINT "mantenimientos_componentes_mantenimiento_id_fkey" FOREIGN KEY ("mantenimiento_id") REFERENCES "mantenimientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos_componentes" ADD CONSTRAINT "mantenimientos_componentes_componente_unidad_id_fkey" FOREIGN KEY ("componente_unidad_id") REFERENCES "componentes_unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
