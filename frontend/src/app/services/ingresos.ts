import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface TotalesIngresos {
  operaciones: number;
  kilometrosRecorridos: number;
  montoLiquidado: number;
  montoCombustible: number;
  galones: number;
}

export interface PeriodoIngresos {
  dias: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface IngresosPorDia extends TotalesIngresos {
  fecha: string;
}

export interface IngresosPorUnidad extends TotalesIngresos {
  unidadId: number;
  numeroUnidad: string;
  placa: string;
}

export interface IngresosPorPiloto extends TotalesIngresos {
  pilotoId: number;
  codigo: string;
  nombreCompleto: string;
}

export interface ResumenIngresos {
  periodo: PeriodoIngresos;
  totales: TotalesIngresos;
  porDia: IngresosPorDia[];
  porUnidad: IngresosPorUnidad[];
  porPiloto: IngresosPorPiloto[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class IngresosService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:3000/api/ingresos';

  obtenerIngresos(
    dias: 1 | 7 | 15 | 30,
    fechaFin: string,
  ): Observable<ApiResponse<ResumenIngresos>> {
    return this.http.get<ApiResponse<ResumenIngresos>>(
      this.apiUrl,
      {
        params: {
          dias: dias.toString(),
          fechaFin,
        },
      },
    );
  }
}