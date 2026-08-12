import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActualizarPilotoRequest,
  CrearPilotoRequest,
  Piloto,
  PilotosService,
} from '../../services/pilotos';

@Component({
  selector: 'app-pilotos',
  imports: [ReactiveFormsModule],
  templateUrl: './pilotos.html',
  styleUrl: './pilotos.scss',
})
export class Pilotos implements OnInit {
  private readonly pilotosService = inject(PilotosService);
  private readonly formBuilder = inject(FormBuilder);

  readonly pilotos = signal<Piloto[]>([]);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly cambiandoEstadoId = signal<number | null>(null);

  readonly mostrarFormulario = signal(false);
  readonly pilotoEditandoId = signal<number | null>(null);

  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formularioPiloto =
    this.formBuilder.nonNullable.group({
      codigo: [
        '',
        Validators.required,
      ],

      nombreCompleto: [
        '',
        Validators.required,
      ],

      telefono: [''],

      numeroLicencia: [
        '',
        Validators.required,
      ],

      vencimientoLicencia: [
        '',
        Validators.required,
      ],

      observaciones: [''],
    });

  ngOnInit(): void {
    this.cargarPilotos();
  }

  cargarPilotos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.pilotosService.obtenerPilotos().subscribe({
      next: (respuesta) => {
        this.pilotos.set(respuesta.data);
        this.cargando.set(false);
      },

      error: (error) => {
        console.error(
          'Error al obtener pilotos:',
          error,
        );

        this.mensajeError.set(
          'No fue posible cargar los pilotos',
        );

        this.cargando.set(false);
      },
    });
  }

  abrirFormulario(): void {
    this.pilotoEditandoId.set(null);

    this.formularioPiloto.reset({
      codigo: '',
      nombreCompleto: '',
      telefono: '',
      numeroLicencia: '',
      vencimientoLicencia: '',
      observaciones: '',
    });

    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.mostrarFormulario.set(true);
  }

  editarPiloto(piloto: Piloto): void {
    this.pilotoEditandoId.set(piloto.id);

    this.formularioPiloto.reset({
      codigo: piloto.codigo,
      nombreCompleto: piloto.nombreCompleto,
      telefono: piloto.telefono ?? '',
      numeroLicencia: piloto.numeroLicencia,
      vencimientoLicencia:
        piloto.vencimientoLicencia.slice(0, 10),
      observaciones: piloto.observaciones ?? '',
    });

    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.formularioPiloto.reset({
      codigo: '',
      nombreCompleto: '',
      telefono: '',
      numeroLicencia: '',
      vencimientoLicencia: '',
      observaciones: '',
    });

    this.pilotoEditandoId.set(null);
    this.mostrarFormulario.set(false);
  }

  guardarPiloto(): void {
    if (this.formularioPiloto.invalid) {
      this.formularioPiloto.markAllAsTouched();
      return;
    }

    const pilotoId = this.pilotoEditandoId();

    if (pilotoId === null) {
      this.registrarPiloto();
      return;
    }

    this.actualizarPiloto(pilotoId);
  }

  registrarPiloto(): void {
    const formulario =
      this.formularioPiloto.getRawValue();

    const datos: CrearPilotoRequest = {
      codigo: formulario.codigo,
      nombreCompleto: formulario.nombreCompleto,
      telefono: formulario.telefono,
      numeroLicencia: formulario.numeroLicencia,
      vencimientoLicencia:
        formulario.vencimientoLicencia,
      observaciones: formulario.observaciones,
    };

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.pilotosService
      .registrarPiloto(datos)
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.guardando.set(false);
          this.cerrarFormulario();
          this.cargarPilotos();
        },

        error: (error) => {
          console.error(
            'Error al registrar piloto:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible registrar el piloto',
          );

          this.guardando.set(false);
        },
      });
  }

  actualizarPiloto(pilotoId: number): void {
    const formulario =
      this.formularioPiloto.getRawValue();

    const datos: ActualizarPilotoRequest = {
      codigo: formulario.codigo,
      nombreCompleto: formulario.nombreCompleto,
      telefono: formulario.telefono,
      numeroLicencia: formulario.numeroLicencia,
      vencimientoLicencia:
        formulario.vencimientoLicencia,
      observaciones: formulario.observaciones,
    };

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.pilotosService
      .actualizarPiloto(pilotoId, datos)
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.guardando.set(false);
          this.cerrarFormulario();
          this.cargarPilotos();
        },

        error: (error) => {
          console.error(
            'Error al actualizar piloto:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible actualizar el piloto',
          );

          this.guardando.set(false);
        },
      });
  }

  cambiarEstado(piloto: Piloto): void {
    const nuevoEstado =
      piloto.estado === 'ACTIVO'
        ? 'INACTIVO'
        : 'ACTIVO';

    this.cambiandoEstadoId.set(piloto.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.pilotosService
      .cambiarEstado(
        piloto.id,
        nuevoEstado,
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.cambiandoEstadoId.set(null);
          this.cargarPilotos();
        },

        error: (error) => {
          console.error(
            'Error al cambiar estado del piloto:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible cambiar el estado del piloto',
          );

          this.cambiandoEstadoId.set(null);
        },
      });
  }

  estaEditando(): boolean {
    return this.pilotoEditandoId() !== null;
  }
}