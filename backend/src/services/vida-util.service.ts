const MILISEGUNDOS_POR_DIA = 86_400_000;

export type EstadoVidaUtil =
  | 'NORMAL'
  | 'PROXIMO_CAMBIO'
  | 'URGENTE';

export type MotivoAlertaVidaUtil =
  | 'NINGUNO'
  | 'TIEMPO'
  | 'KILOMETRAJE'
  | 'AMBOS';

export type NivelRiesgoVidaUtil =
  | 'VERDE'
  | 'NARANJA'
  | 'AMARILLO'
  | 'ROJO';

export interface ComponenteInstaladoEvaluable {
  fechaInstalacion: Date;
  kilometrajeInstalacion: number;
  vidaUtilMeses: number | null;
  vidaUtilKm: number | null;
  alertaDiasAntes: number;
  alertaKmAntes: number;
}

export interface UsoVidaUtilTiempo {
  fechaLimite: Date | null;
  diasTranscurridos: number;
  mesesUtilizados: number;
  porcentajeUtilizado: number | null;
  diasRestantes: number | null;
}

export interface UsoVidaUtilKilometraje {
  kilometrajeLimite: number | null;
  kilometrosRecorridos: number;
  porcentajeUtilizado: number | null;
  kilometrosRestantes: number | null;
}

export interface EvaluacionVidaUtil {
  estado: EstadoVidaUtil;
  motivo: MotivoAlertaVidaUtil;
  nivelRiesgo: NivelRiesgoVidaUtil;
  porcentajeVidaRestante: number;
  diasRestantes: number | null;
  kilometrosRestantes: number | null;
  detalle: string;
  tiempo: UsoVidaUtilTiempo;
  kilometraje: UsoVidaUtilKilometraje;
}

function normalizarFecha(fecha: Date): Date {
  if (Number.isNaN(fecha.getTime())) {
    throw new RangeError(
      'La fecha de evaluación o instalación no es válida',
    );
  }

  return new Date(
    Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate(),
    ),
  );
}

function agregarMesesCalendario(
  fecha: Date,
  meses: number,
): Date {
  const indiceMes = fecha.getUTCMonth() + meses;
  const inicioMesDestino = new Date(
    Date.UTC(fecha.getUTCFullYear(), indiceMes, 1),
  );
  const ultimoDiaMesDestino = new Date(
    Date.UTC(
      inicioMesDestino.getUTCFullYear(),
      inicioMesDestino.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      inicioMesDestino.getUTCFullYear(),
      inicioMesDestino.getUTCMonth(),
      Math.min(fecha.getUTCDate(), ultimoDiaMesDestino),
    ),
  );
}

function diferenciaDias(
  fechaInicial: Date,
  fechaFinal: Date,
): number {
  return Math.trunc(
    (fechaFinal.getTime() - fechaInicial.getTime()) /
      MILISEGUNDOS_POR_DIA,
  );
}

function calcularMesesCompletos(
  fechaInstalacion: Date,
  fechaEvaluacion: Date,
): number {
  let meses =
    (fechaEvaluacion.getUTCFullYear() -
      fechaInstalacion.getUTCFullYear()) *
      12 +
    fechaEvaluacion.getUTCMonth() -
    fechaInstalacion.getUTCMonth();

  if (
    meses > 0 &&
    agregarMesesCalendario(fechaInstalacion, meses) >
      fechaEvaluacion
  ) {
    meses -= 1;
  }

  return Math.max(0, meses);
}

function redondearPorcentaje(valor: number): number {
  return Number(valor.toFixed(2));
}

function limitarPorcentaje(valor: number): number {
  return Math.min(100, Math.max(0, valor));
}

function determinarNivelRiesgo(
  porcentajeVidaRestante: number,
): NivelRiesgoVidaUtil {
  if (porcentajeVidaRestante >= 76) {
    return 'VERDE';
  }

  if (porcentajeVidaRestante >= 41) {
    return 'NARANJA';
  }

  if (porcentajeVidaRestante >= 16) {
    return 'AMARILLO';
  }

  return 'ROJO';
}

function determinarMotivo(
  tiempoActivo: boolean,
  kilometrajeActivo: boolean,
): MotivoAlertaVidaUtil {
  if (tiempoActivo && kilometrajeActivo) {
    return 'AMBOS';
  }

  if (tiempoActivo) {
    return 'TIEMPO';
  }

  if (kilometrajeActivo) {
    return 'KILOMETRAJE';
  }

  return 'NINGUNO';
}

function describirTiempo(diasRestantes: number): string {
  if (diasRestantes < 0) {
    return `vida útil por tiempo excedida por ${Math.abs(diasRestantes)} días`;
  }

  if (diasRestantes === 0) {
    return 'vida útil por tiempo alcanzada hoy';
  }

  return `quedan ${diasRestantes} días de vida útil por tiempo`;
}

function describirKilometraje(
  kilometrosRestantes: number,
): string {
  if (kilometrosRestantes < 0) {
    return `vida útil por kilometraje excedida por ${Math.abs(kilometrosRestantes)} km`;
  }

  if (kilometrosRestantes === 0) {
    return 'vida útil por kilometraje alcanzada';
  }

  return `quedan ${kilometrosRestantes} km de vida útil`;
}

function crearDetalle(
  estado: EstadoVidaUtil,
  motivo: MotivoAlertaVidaUtil,
  diasRestantes: number | null,
  kilometrosRestantes: number | null,
  porcentajeVidaRestante: number,
): string {
  if (estado === 'NORMAL') {
    return `Componente dentro de los límites configurados. Vida útil restante: ${porcentajeVidaRestante.toFixed(2)}%.`;
  }

  const detalles: string[] = [];

  if (
    (motivo === 'TIEMPO' || motivo === 'AMBOS') &&
    diasRestantes !== null
  ) {
    detalles.push(describirTiempo(diasRestantes));
  }

  if (
    (motivo === 'KILOMETRAJE' || motivo === 'AMBOS') &&
    kilometrosRestantes !== null
  ) {
    detalles.push(
      describirKilometraje(kilometrosRestantes),
    );
  }

  const prefijo =
    estado === 'URGENTE'
      ? 'Cambio urgente'
      : 'Próximo cambio';

  return `${prefijo}: ${detalles.join('; ')}.`;
}

export function evaluarVidaUtilComponente(
  componente: ComponenteInstaladoEvaluable,
  fechaActual: Date,
  kilometrajeActualUnidad: number,
): EvaluacionVidaUtil {
  if (
    !Number.isInteger(componente.kilometrajeInstalacion) ||
    componente.kilometrajeInstalacion < 0 ||
    !Number.isInteger(componente.alertaDiasAntes) ||
    componente.alertaDiasAntes < 0 ||
    !Number.isInteger(componente.alertaKmAntes) ||
    componente.alertaKmAntes < 0 ||
    (componente.vidaUtilMeses !== null &&
      (!Number.isInteger(componente.vidaUtilMeses) ||
        componente.vidaUtilMeses <= 0)) ||
    (componente.vidaUtilKm !== null &&
      (!Number.isInteger(componente.vidaUtilKm) ||
        componente.vidaUtilKm <= 0))
  ) {
    throw new RangeError(
      'La configuración de vida útil del componente no es válida',
    );
  }

  const fechaInstalacion = normalizarFecha(
    componente.fechaInstalacion,
  );
  const fechaEvaluacion = normalizarFecha(fechaActual);

  if (fechaEvaluacion < fechaInstalacion) {
    throw new RangeError(
      'La fecha de evaluación no puede ser anterior a la instalación',
    );
  }

  if (
    !Number.isInteger(kilometrajeActualUnidad) ||
    kilometrajeActualUnidad < componente.kilometrajeInstalacion
  ) {
    throw new RangeError(
      'El kilometraje actual no puede ser menor al kilometraje de instalación',
    );
  }

  if (
    componente.vidaUtilMeses === null &&
    componente.vidaUtilKm === null
  ) {
    throw new RangeError(
      'El componente debe tener vida útil por tiempo, kilometraje o ambos',
    );
  }

  const diasTranscurridos = diferenciaDias(
    fechaInstalacion,
    fechaEvaluacion,
  );
  const mesesUtilizados = calcularMesesCompletos(
    fechaInstalacion,
    fechaEvaluacion,
  );

  const fechaLimite =
    componente.vidaUtilMeses !== null
      ? agregarMesesCalendario(
          fechaInstalacion,
          componente.vidaUtilMeses,
        )
      : null;
  const diasTotales =
    fechaLimite !== null
      ? diferenciaDias(fechaInstalacion, fechaLimite)
      : null;
  const diasRestantes =
    fechaLimite !== null
      ? diferenciaDias(fechaEvaluacion, fechaLimite)
      : null;
  const porcentajeTiempo =
    diasTotales !== null && diasTotales > 0
      ? redondearPorcentaje(
          (diasTranscurridos / diasTotales) * 100,
        )
      : null;

  const kilometrosRecorridos =
    kilometrajeActualUnidad -
    componente.kilometrajeInstalacion;
  const kilometrajeLimite =
    componente.vidaUtilKm !== null
      ? componente.kilometrajeInstalacion +
        componente.vidaUtilKm
      : null;
  const kilometrosRestantes =
    componente.vidaUtilKm !== null
      ? componente.vidaUtilKm - kilometrosRecorridos
      : null;
  const porcentajeKilometraje =
    componente.vidaUtilKm !== null
      ? redondearPorcentaje(
          (kilometrosRecorridos /
            componente.vidaUtilKm) *
            100,
        )
      : null;

  const tiempoUrgente =
    diasRestantes !== null && diasRestantes <= 0;
  const kilometrajeUrgente =
    kilometrosRestantes !== null &&
    kilometrosRestantes <= 0;
  const tiempoProximo =
    diasRestantes !== null &&
    diasRestantes <= componente.alertaDiasAntes;
  const kilometrajeProximo =
    kilometrosRestantes !== null &&
    kilometrosRestantes <= componente.alertaKmAntes;

  let estado: EstadoVidaUtil = 'NORMAL';
  let motivo: MotivoAlertaVidaUtil = 'NINGUNO';

  if (tiempoUrgente || kilometrajeUrgente) {
    estado = 'URGENTE';
    motivo = determinarMotivo(
      tiempoUrgente,
      kilometrajeUrgente,
    );
  } else if (tiempoProximo || kilometrajeProximo) {
    estado = 'PROXIMO_CAMBIO';
    motivo = determinarMotivo(
      tiempoProximo,
      kilometrajeProximo,
    );
  }

  const porcentajesUtilizados = [
    porcentajeTiempo,
    porcentajeKilometraje,
  ].filter((valor): valor is number => valor !== null);
  const mayorPorcentajeUtilizado = Math.max(
    ...porcentajesUtilizados,
  );
  const porcentajeVidaRestante = redondearPorcentaje(
    limitarPorcentaje(100 - mayorPorcentajeUtilizado),
  );

  return {
    estado,
    motivo,
    nivelRiesgo: determinarNivelRiesgo(
      porcentajeVidaRestante,
    ),
    porcentajeVidaRestante,
    diasRestantes,
    kilometrosRestantes,
    detalle: crearDetalle(
      estado,
      motivo,
      diasRestantes,
      kilometrosRestantes,
      porcentajeVidaRestante,
    ),
    tiempo: {
      fechaLimite,
      diasTranscurridos,
      mesesUtilizados,
      porcentajeUtilizado: porcentajeTiempo,
      diasRestantes,
    },
    kilometraje: {
      kilometrajeLimite,
      kilometrosRecorridos,
      porcentajeUtilizado: porcentajeKilometraje,
      kilometrosRestantes,
    },
  };
}
