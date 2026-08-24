export type InterpretacionMuestra =
  | 'NO_HAY_DATOS_SUFICIENTES'
  | 'MUESTRA_LIMITADA'
  | 'DATOS_SUFICIENTES';

export interface ReemplazosPorUnidad {
  unidadId: number;
  numeroUnidad: string;
  placa: string;
  reemplazos: number;
}

export interface CriterioVidaUtil {
  cumplimientoPromedio: number | null;
  muestra: number;
  registrosExcluidos: number;
  interpretacion: InterpretacionMuestra;
}

export interface VidaUtilKilometraje extends CriterioVidaUtil {
  vidaRealPromedioKm: number | null;
  vidaEsperadaPromedioKm: number | null;
}

export interface VidaUtilTiempo extends CriterioVidaUtil {
  vidaRealPromedioDias: number | null;
  vidaEsperadaPromedioDias: number | null;
}

export interface VidaUtilPorCatalogo {
  catalogoComponenteId: number;
  nombre: string;
  kilometraje: VidaUtilKilometraje;
  tiempo: VidaUtilTiempo;
}

export interface FrecuenciaReemplazo {
  catalogoComponenteId: number;
  nombre: string;
  reemplazos: number;
}

export interface IndicadoresMantenimiento {
  reemplazosPorUnidad: ReemplazosPorUnidad[];
  vidaUtilPorCatalogo: VidaUtilPorCatalogo[];
  frecuenciaReemplazo: FrecuenciaReemplazo[];
  metadatos: {
    periodo: 'TODO_HISTORIAL';
    generadoEn: string;
    reemplazosAnalizados: number;
  };
}
