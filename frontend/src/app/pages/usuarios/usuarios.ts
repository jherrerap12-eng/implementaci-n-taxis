import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import {
  ActualizarUsuarioRequest,
  CrearUsuarioRequest,
  UsuarioAdministrado,
} from '../../models/usuarios.models';
import { UsuariosService } from '../../services/usuarios';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios implements OnInit {
  private readonly usuariosService =
    inject(UsuariosService);
  private readonly formBuilder = inject(FormBuilder);

  readonly usuarios = signal<UsuarioAdministrado[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly procesandoId = signal<number | null>(null);
  readonly mostrarFormulario = signal(false);
  readonly usuarioEditandoId = signal<number | null>(null);
  readonly usuarioContrasena =
    signal<UsuarioAdministrado | null>(null);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formularioUsuario =
    this.formBuilder.nonNullable.group({
      nombreCompleto: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(150),
        ],
      ],
      correo: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(150),
        ],
      ],
      contrasena: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(256),
        ],
      ],
      rol: ['DUENO' as const],
    });

  readonly formularioContrasena =
    this.formBuilder.nonNullable.group({
      nuevaContrasena: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(256),
        ],
      ],
    });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.usuariosService
      .obtenerUsuarios()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) =>
          this.usuarios.set(respuesta.data),
        error: (error) =>
          this.mostrarError(
            error,
            'No fue posible cargar los usuarios',
          ),
      });
  }

  abrirNuevoUsuario(): void {
    this.usuarioEditandoId.set(null);
    this.formularioUsuario.reset({
      nombreCompleto: '',
      correo: '',
      contrasena: '',
      rol: 'DUENO',
    });
    this.formularioUsuario.controls.contrasena.setValidators([
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(256),
    ]);
    this.formularioUsuario.controls.contrasena.updateValueAndValidity();
    this.limpiarMensajes();
    this.mostrarFormulario.set(true);
  }

  editarUsuario(usuario: UsuarioAdministrado): void {
    if (usuario.rol !== 'DUENO') {
      return;
    }

    this.usuarioEditandoId.set(usuario.id);
    this.formularioUsuario.reset({
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.correo,
      contrasena: '',
      rol: 'DUENO',
    });
    this.formularioUsuario.controls.contrasena.clearValidators();
    this.formularioUsuario.controls.contrasena.updateValueAndValidity();
    this.limpiarMensajes();
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.usuarioEditandoId.set(null);
  }

  guardarUsuario(): void {
    if (this.formularioUsuario.invalid) {
      this.formularioUsuario.markAllAsTouched();
      return;
    }

    const datos = this.formularioUsuario.getRawValue();
    const usuarioId = this.usuarioEditandoId();

    this.guardando.set(true);
    this.limpiarMensajes();

    const operacion = usuarioId === null
      ? this.usuariosService.crearUsuario({
          nombreCompleto: datos.nombreCompleto,
          correo: datos.correo,
          contrasena: datos.contrasena,
          rol: 'DUENO',
        } satisfies CrearUsuarioRequest)
      : this.usuariosService.actualizarUsuario(
          usuarioId,
          {
            nombreCompleto: datos.nombreCompleto,
            correo: datos.correo,
            rol: 'DUENO',
          } satisfies ActualizarUsuarioRequest,
        );

    operacion
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.message);
          this.cerrarFormulario();
          this.cargarUsuarios();
        },
        error: (error) =>
          this.mostrarError(
            error,
            'No fue posible guardar el usuario',
          ),
      });
  }

  cambiarEstado(usuario: UsuarioAdministrado): void {
    if (usuario.rol !== 'DUENO') {
      return;
    }

    this.procesandoId.set(usuario.id);
    this.limpiarMensajes();

    this.usuariosService
      .cambiarEstado(usuario.id, {
        activo: !usuario.activo,
      })
      .pipe(finalize(() => this.procesandoId.set(null)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.message);
          this.cargarUsuarios();
        },
        error: (error) =>
          this.mostrarError(
            error,
            'No fue posible cambiar el estado',
          ),
      });
  }

  abrirContrasena(usuario: UsuarioAdministrado): void {
    if (usuario.rol !== 'DUENO') {
      return;
    }

    this.usuarioContrasena.set(usuario);
    this.formularioContrasena.reset({
      nuevaContrasena: '',
    });
    this.limpiarMensajes();
  }

  cerrarContrasena(): void {
    this.usuarioContrasena.set(null);
    this.formularioContrasena.reset({
      nuevaContrasena: '',
    });
  }

  guardarContrasena(): void {
    const usuario = this.usuarioContrasena();

    if (!usuario || this.formularioContrasena.invalid) {
      this.formularioContrasena.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.limpiarMensajes();

    this.usuariosService
      .restablecerContrasena(
        usuario.id,
        this.formularioContrasena.getRawValue(),
      )
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.message);
          this.cerrarContrasena();
        },
        error: (error) =>
          this.mostrarError(
            error,
            'No fue posible restablecer la contraseña',
          ),
      });
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return 'Sin acceso registrado';
    }

    return new Intl.DateTimeFormat('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(fecha));
  }

  private limpiarMensajes(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
  }

  private mostrarError(
    error: { error?: { message?: string } },
    mensaje: string,
  ): void {
    this.mensajeError.set(
      error.error?.message || mensaje,
    );
  }
}
