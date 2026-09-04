export type TipoMovimientoAhorro =
  | 'APORTE_DIARIO'
  | 'RETIRO'
  | 'AJUSTE_INGRESO'
  | 'AJUSTE_EGRESO';

export interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ResumenAhorroPiloto {
  id: number;
  codigo: string;
  nombreCompleto: string;
  estado: string;
  totalAportado: number;
  totalRetirado: number;
  ajustesIngreso: number;
  ajustesEgreso: number;
  saldoDisponible: number;
  ultimoMovimientoEn: string | null;
}

export interface MovimientoAhorro {
  id: number;
  tipo: TipoMovimientoAhorro;
  monto: number;
  descripcion: string | null;
  creadoEn: string;
  signo: 1 | -1;
  saldoAcumulado: number;
  registroDiario: { id: number; fecha: string } | null;
}

export interface HistorialAhorroPiloto {
  piloto: Pick<ResumenAhorroPiloto, 'id' | 'codigo' | 'nombreCompleto' | 'estado'>;
  saldoDisponible: number;
  movimientos: MovimientoAhorro[];
}
