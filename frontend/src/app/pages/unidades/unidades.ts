import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActualizarUnidadRequest,
  CrearUnidadRequest,
  Unidad,
  UnidadesService,
} from '../../services/unidades';

@Component({
  selector: 'app-unidades',
  imports: [ReactiveFormsModule],
  templateUrl: './unidades.html',
  styleUrl: './unidades.scss',
})
export class Unidades implements OnInit {
  private readonly unidadesService = inject(UnidadesService);
  private readonly formBuilder = inject(FormBuilder);

  readonly unidades = signal<Unidad[]>([]);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly cambiandoEstadoId = signal<number | null>(null);

  readonly mostrarFormulario = signal(false);
  readonly unidadEditandoId = signal<number | null>(null);

  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formularioUnidad =
    this.formBuilder.nonNullable.group({
      numeroUnidad: [
        '',
        Validators.required,
      ],

      placa: [
        '',
        Validators.required,
      ],

      marca: [
        '',
        Validators.required,
      ],

      modelo: [
        '',
        Validators.required,
      ],

      anio: [
        new Date().getFullYear(),
        [
          Validators.required,
          Validators.min(1950),
          Validators.max(
            new Date().getFullYear() + 1,
          ),
        ],
      ],

      tipoCombustible: [
        'GASOLINA' as 'GASOLINA' | 'DIESEL',
        Validators.required,
      ],

      kilometrajeActual: [
        0,
        [
          Validators.required,
          Validators.min(0),
        ],
      ],

      intervaloMantenimientoKm:
        this.formBuilder.control<number | null>(
          null,
          [
            Validators.min(1),
          ],
        ),

      proximoMantenimientoKm:
        this.formBuilder.control<number | null>(
          null,
          [
            Validators.min(0),
          ],
        ),

      observaciones: [''],
    });

  ngOnInit(): void {
    this.cargarUnidades();
  }

  cargarUnidades(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.unidadesService.obtenerUnidades().subscribe({
      next: (respuesta) => {
        this.unidades.set(respuesta.data);
        this.cargando.set(false);
      },

      error: (error) => {
        console.error(
          'Error al obtener unidades:',
          error,
        );

        this.mensajeError.set(
          'No fue posible cargar las unidades',
        );

        this.cargando.set(false);
      },
    });
  }

  abrirFormulario(): void {
    this.unidadEditandoId.set(null);

    this.formularioUnidad.reset({
      numeroUnidad: '',
      placa: '',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      tipoCombustible: 'GASOLINA',
      kilometrajeActual: 0,
      intervaloMantenimientoKm: null,
      proximoMantenimientoKm: null,
      observaciones: '',
    });

    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.mostrarFormulario.set(true);
  }

  editarUnidad(unidad: Unidad): void {
    this.unidadEditandoId.set(unidad.id);

    this.formularioUnidad.reset({
      numeroUnidad: unidad.numeroUnidad,
      placa: unidad.placa,
      marca: unidad.marca,
      modelo: unidad.modelo,
      anio: unidad.anio,
      tipoCombustible: unidad.tipoCombustible,
      kilometrajeActual:
        unidad.kilometrajeActual,
      intervaloMantenimientoKm:
        unidad.intervaloMantenimientoKm,
      proximoMantenimientoKm:
        unidad.proximoMantenimientoKm,
      observaciones:
        unidad.observaciones ?? '',
    });

    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.formularioUnidad.reset({
      numeroUnidad: '',
      placa: '',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      tipoCombustible: 'GASOLINA',
      kilometrajeActual: 0,
      intervaloMantenimientoKm: null,
      proximoMantenimientoKm: null,
      observaciones: '',
    });

    this.unidadEditandoId.set(null);
    this.mostrarFormulario.set(false);
  }

  guardarUnidad(): void {
    if (this.formularioUnidad.invalid) {
      this.formularioUnidad.markAllAsTouched();
      return;
    }

    if (!this.validarPlanMantenimiento()) {
      return;
    }

    const unidadId = this.unidadEditandoId();

    if (unidadId === null) {
      this.registrarUnidad();
      return;
    }

    this.actualizarUnidad(unidadId);
  }

  registrarUnidad(): void {
    const formulario =
      this.formularioUnidad.getRawValue();

    const datos: CrearUnidadRequest = {
      numeroUnidad:
        formulario.numeroUnidad,

      placa:
        formulario.placa,

      marca:
        formulario.marca,

      modelo:
        formulario.modelo,

      anio:
        formulario.anio,

      tipoCombustible:
        formulario.tipoCombustible,

      kilometrajeActual:
        formulario.kilometrajeActual,

      intervaloMantenimientoKm:
        formulario.intervaloMantenimientoKm,

      proximoMantenimientoKm:
        formulario.proximoMantenimientoKm,

      observaciones:
        formulario.observaciones,
    };

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.unidadesService
      .registrarUnidad(datos)
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.guardando.set(false);
          this.cerrarFormulario();
          this.cargarUnidades();
        },

        error: (error) => {
          console.error(
            'Error al registrar unidad:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible registrar la unidad',
          );

          this.guardando.set(false);
        },
      });
  }

  actualizarUnidad(
    unidadId: number,
  ): void {
    const formulario =
      this.formularioUnidad.getRawValue();

    const datos: ActualizarUnidadRequest = {
      numeroUnidad:
        formulario.numeroUnidad,

      placa:
        formulario.placa,

      marca:
        formulario.marca,

      modelo:
        formulario.modelo,

      anio:
        formulario.anio,

      tipoCombustible:
        formulario.tipoCombustible,

      intervaloMantenimientoKm:
        formulario.intervaloMantenimientoKm,

      proximoMantenimientoKm:
        formulario.proximoMantenimientoKm,

      observaciones:
        formulario.observaciones,
    };

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.unidadesService
      .actualizarUnidad(
        unidadId,
        datos,
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.guardando.set(false);
          this.cerrarFormulario();
          this.cargarUnidades();
        },

        error: (error) => {
          console.error(
            'Error al actualizar unidad:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible actualizar la unidad',
          );

          this.guardando.set(false);
        },
      });
  }

  cambiarEstado(
    unidad: Unidad,
    nuevoEstado:
      | 'DISPONIBLE'
      | 'EN_RUTA'
      | 'FUERA_DE_SERVICIO',
  ): void {
    if (
      unidad.estado === 'MANTENIMIENTO'
    ) {
      this.mensajeError.set(
        'La unidad tiene un mantenimiento en proceso. Debes finalizarlo desde el módulo de Mantenimientos',
      );
      return;
    }

    if (
      unidad.estado === nuevoEstado
    ) {
      return;
    }

    this.cambiandoEstadoId.set(
      unidad.id,
    );

    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.unidadesService
      .cambiarEstado(
        unidad.id,
        nuevoEstado,
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.cambiandoEstadoId.set(
            null,
          );

          this.cargarUnidades();
        },

        error: (error) => {
          console.error(
            'Error al cambiar estado de la unidad:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible cambiar el estado de la unidad',
          );

          this.cambiandoEstadoId.set(
            null,
          );
        },
      });
  }

  estaEditando(): boolean {
    return this.unidadEditandoId() !== null;
  }

  private validarPlanMantenimiento(): boolean {
    const intervalo =
      this.formularioUnidad.controls
        .intervaloMantenimientoKm.value;

    const proximo =
      this.formularioUnidad.controls
        .proximoMantenimientoKm.value;

    const tieneIntervalo =
      intervalo !== null;

    const tieneProximo =
      proximo !== null;

    if (tieneIntervalo !== tieneProximo) {
      this.mensajeError.set(
        'Para configurar el plan de mantenimiento debes indicar el intervalo y el próximo kilometraje',
      );

      return false;
    }

    return true;
  }
}