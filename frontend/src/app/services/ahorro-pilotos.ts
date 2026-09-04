import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  HistorialAhorroPiloto,
  RespuestaApi,
  ResumenAhorroPiloto,
} from '../models/ahorro-pilotos.models';

@Injectable({ providedIn: 'root' })
export class AhorroPilotosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/ahorro-pilotos';

  listar() {
    return this.http.get<RespuestaApi<ResumenAhorroPiloto[]>>(this.apiUrl);
  }

  obtenerMovimientos(pilotoId: number) {
    return this.http.get<RespuestaApi<HistorialAhorroPiloto>>(
      `${this.apiUrl}/${pilotoId}/movimientos`,
    );
  }

  registrarAjuste(pilotoId: number, datos: { tipo: 'INGRESO' | 'EGRESO'; monto: number; descripcion: string }) {
    return this.http.post<RespuestaApi<unknown>>(`${this.apiUrl}/${pilotoId}/ajustes`, datos);
  }

  registrarRetiro(pilotoId: number, datos: { liquidarTodo: boolean; monto?: number; descripcion?: string }) {
    return this.http.post<RespuestaApi<unknown>>(`${this.apiUrl}/${pilotoId}/retiros`, datos);
  }
}
