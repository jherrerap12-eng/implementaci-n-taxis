import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { IndicadoresMantenimiento } from '../models/indicadores-mantenimiento.models';

interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class IndicadoresMantenimientoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/indicadores-mantenimiento';

  obtener(): Observable<RespuestaApi<IndicadoresMantenimiento>> {
    return this.http.get<RespuestaApi<IndicadoresMantenimiento>>(this.apiUrl);
  }
}
