import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Unidad } from './unidades';

export type TipoGasto =
  | 'REPUESTOS_MENORES'
  | 'PINCHAZO';

export interface Gasto {
  id: number;
  unidadId: number;
  fecha: string;
  tipo: TipoGasto;
  descripcion: string | null;
  monto: string;
  creadoEn: string;
  unidad: Unidad;
}

export interface CrearGastoRequest {
  unidadId: number;
  fecha: string;
  tipo: TipoGasto;
  descripcion?: string;
  monto: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class GastosService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:3000/api/gastos';

  obtenerGastos(): Observable<ApiResponse<Gasto[]>> {
    return this.http.get<ApiResponse<Gasto[]>>(
      this.apiUrl,
    );
  }

  registrarGasto(
    datos: CrearGastoRequest,
  ): Observable<ApiResponse<Gasto>> {
    return this.http.post<ApiResponse<Gasto>>(
      this.apiUrl,
      datos,
    );
  }
}