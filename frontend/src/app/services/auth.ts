import { environment } from '../../environments/environment';
import {
  HttpClient,
  HttpHeaders,
} from '@angular/common/http';
import {
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import {
  catchError,
  map,
  Observable,
  of,
  tap,
  throwError,
} from 'rxjs';

import {
  RespuestaLogin,
  RolUsuario,
  UsuarioAutenticado,
} from '../models/auth.models';

interface RespuestaUsuarioActual {
  success: boolean;
  message: string;
  data: UsuarioAutenticado;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  private readonly claveToken =
    'flotilla_access_token';

  private readonly tokenInterno =
    signal<string | null>(null);

  readonly usuario =
    signal<UsuarioAutenticado | null>(null);

  readonly token = this.tokenInterno.asReadonly();

  readonly autenticado = computed(
    () =>
      this.tokenInterno() !== null &&
      this.usuario() !== null,
  );

  readonly rol = computed(
    () => this.usuario()?.rol ?? null,
  );

  login(
    correo: string,
    contrasena: string,
  ): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>(
        `${this.apiUrl}/login`,
        {
          correo,
          contrasena,
        },
      )
      .pipe(
        tap((respuesta) => {
          this.guardarSesion(
            respuesta.data.token,
            respuesta.data.usuario,
          );
        }),
      );
  }

  obtenerUsuarioActual(): Observable<UsuarioAutenticado> {
    const token =
      this.tokenInterno() ??
      sessionStorage.getItem(this.claveToken);

    if (!token) {
      return throwError(
        () => new Error('No existe una sesión activa'),
      );
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<RespuestaUsuarioActual>(
        `${this.apiUrl}/me`,
        {
          headers,
        },
      )
      .pipe(
        tap((respuesta) => {
          this.tokenInterno.set(token);
          this.usuario.set(respuesta.data);
        }),
        map((respuesta) => respuesta.data),
      );
  }

  restaurarSesion(): Observable<UsuarioAutenticado | null> {
    const token = sessionStorage.getItem(
      this.claveToken,
    );

    if (!token) {
      this.cerrarSesion();
      return of(null);
    }

    this.tokenInterno.set(token);

    return this.obtenerUsuarioActual().pipe(
      catchError(() => {
        this.cerrarSesion();
        return of(null);
      }),
    );
  }

  cerrarSesion(): void {
    sessionStorage.removeItem(this.claveToken);
    this.tokenInterno.set(null);
    this.usuario.set(null);
  }

  tieneRol(...roles: RolUsuario[]): boolean {
    const rolActual = this.rol();

    return (
      rolActual !== null &&
      roles.includes(rolActual)
    );
  }

  private guardarSesion(
    token: string,
    usuario: UsuarioAutenticado,
  ): void {
    sessionStorage.setItem(
      this.claveToken,
      token,
    );

    this.tokenInterno.set(token);
    this.usuario.set(usuario);
  }
}
