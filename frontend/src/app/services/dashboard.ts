import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { TotalesGeneralesIngresos } from './ingresos';

export interface ResumenUnidadDashboard {
  unidadId: number;
  numeroUnidad: string;
  placa: string;
  operaciones: number;
  kilometrosRecorridos: number;
  montoLiquidado: number;
  montoCombustible: number;
  galones: number;
}

export interface AlertaMantenimientoDashboard {
  id: number;
  numeroUnidad: string;
  placa: string;
  marca: string;
  modelo: string;
  kilometrajeActual: number;
  proximoMantenimientoKm: number | null;
}

export interface AlertaComponenteDashboard {
  id: number;
  unidad: string;
  placa: string;
  nombreComponente: string;
  marca: string | null;
  modelo: string | null;
  posicion: string | null;
  estado: 'PROXIMO_CAMBIO' | 'URGENTE';
  motivo: 'TIEMPO' | 'KILOMETRAJE' | 'AMBOS';
  nivelRiesgo: 'VERDE' | 'NARANJA' | 'AMARILLO' | 'ROJO';
  porcentajeVidaRestante: number;
  diasRestantes: number | null;
  kilometrosRestantes: number | null;
  detalle: string;
}

export interface ResumenDashboard {
  fecha: string;
  totales: TotalesGeneralesIngresos;
  porUnidad: ResumenUnidadDashboard[];
  alertasMantenimiento: {
    requeridas: AlertaMantenimientoDashboard[];
    proximas: AlertaMantenimientoDashboard[];
  };
  alertasComponentes: AlertaComponenteDashboard[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/dashboard';

  obtenerDashboard(): Observable<ApiResponse<ResumenDashboard>> {
    return this.http.get<ApiResponse<ResumenDashboard>>(this.apiUrl);
  }
}
