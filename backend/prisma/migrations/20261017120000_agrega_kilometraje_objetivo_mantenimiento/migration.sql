-- El objetivo se conserva como una instantánea porque la unidad cambia su
-- próximo mantenimiento al finalizar cada servicio.
ALTER TABLE "mantenimientos"
ADD COLUMN "kilometraje_objetivo" INTEGER;

ALTER TABLE "mantenimientos"
ADD CONSTRAINT "chk_mantenimientos_kilometraje_objetivo_no_negativo"
CHECK ("kilometraje_objetivo" IS NULL OR "kilometraje_objetivo" >= 0);

-- Recupera el objetivo de mantenimientos históricos vinculados a un
-- componente con vida útil por kilometraje. Se prioriza el aceite de motor
-- cuando un mantenimiento atendió más de un componente.
UPDATE "mantenimientos" AS m
SET "kilometraje_objetivo" = (
  SELECT
    cu."kilometraje_instalacion" + cu."vida_util_km"
  FROM "mantenimientos_componentes" AS mc
  INNER JOIN "componentes_unidad" AS cu
    ON cu."id" = mc."componente_unidad_id"
  INNER JOIN "catalogo_componentes" AS cc
    ON cc."id" = cu."catalogo_componente_id"
  WHERE mc."mantenimiento_id" = m."id"
    AND mc."accion" IN ('REEMPLAZO', 'RETIRO')
    AND cu."vida_util_km" IS NOT NULL
  ORDER BY
    CASE WHEN UPPER(BTRIM(cc."nombre")) = 'ACEITE DE MOTOR' THEN 0 ELSE 1 END,
    mc."id"
  LIMIT 1
);
