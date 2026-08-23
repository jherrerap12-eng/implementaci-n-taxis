import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ActualizarUsuarioRequest,
  CambiarEstadoUsuarioRequest,
  CrearUsuarioRequest,
  RespuestaApi,
  RestablecerContrasenaRequest,
  UsuarioAdministrado,
} from '../models/usuarios.models';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:3000/api/usuarios';

  obtenerUsuarios(): Observable<
    RespuestaApi<UsuarioAdministrado[]>
  > {
    return this.http.get<
      RespuestaApi<UsuarioAdministrado[]>
    >(this.apiUrl);
  }

  obtenerUsuario(
    usuarioId: number,
  ): Observable<RespuestaApi<UsuarioAdministrado>> {
    return this.http.get<
      RespuestaApi<UsuarioAdministrado>
    >(`${this.apiUrl}/${usuarioId}`);
  }

  crearUsuario(
    datos: CrearUsuarioRequest,
  ): Observable<RespuestaApi<UsuarioAdministrado>> {
    return this.http.post<
      RespuestaApi<UsuarioAdministrado>
    >(this.apiUrl, datos);
  }

  actualizarUsuario(
    usuarioId: number,
    datos: ActualizarUsuarioRequest,
  ): Observable<RespuestaApi<UsuarioAdministrado>> {
    return this.http.patch<
      RespuestaApi<UsuarioAdministrado>
    >(`${this.apiUrl}/${usuarioId}`, datos);
  }

  cambiarEstado(
    usuarioId: number,
    datos: CambiarEstadoUsuarioRequest,
  ): Observable<RespuestaApi<UsuarioAdministrado>> {
    return this.http.patch<
      RespuestaApi<UsuarioAdministrado>
    >(`${this.apiUrl}/${usuarioId}/estado`, datos);
  }

  restablecerContrasena(
    usuarioId: number,
    datos: RestablecerContrasenaRequest,
  ): Observable<RespuestaApi<UsuarioAdministrado>> {
    return this.http.post<
      RespuestaApi<UsuarioAdministrado>
    >(
      `${this.apiUrl}/${usuarioId}/restablecer-contrasena`,
      datos,
    );
  }
}
