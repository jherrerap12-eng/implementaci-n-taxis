import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  CrearMantenimientoRequest,
  Mantenimiento,
  MantenimientosService,
} from '../../services/mantenimientos';
import {
  Unidad,
  UnidadesService,
} from '../../services/unidades';

@Component({
  selector: 'app-mantenimientos',
  imports: [ReactiveFormsModule],
  templateUrl: './mantenimientos.html',
  styleUrl: './mantenimientos.scss',
})
export class Mantenimientos implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly mantenimientosService =
    inject(MantenimientosService);
  private readonly unidadesService = inject(UnidadesService);

  readonly mantenimientos = signal<Mantenimiento[]>([]);
  readonly unidades = signal<Unidad[]>([]);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly finalizandoId = signal<number | null>(null);

  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formularioMantenimiento =
    this.formBuilder.nonNullable.group({
      unidadId: [
        0,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],

      fechaInicio: [
        this.obtenerFechaActual(),
        Validators.required,
      ],

      descripcion: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
        ],
      ],

      costo: [
        0,
        [
          Validators.required,
          Validators.min(0),
        ],
      ],
    });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    forkJoin({
      mantenimientos:
        this.mantenimientosService.obtenerMantenimientos(),

      unidades:
        this.unidadesService.obtenerUnidades(),
    }).subscribe({
      next: (respuesta) => {
        this.mantenimientos.set(
          respuesta.mantenimientos.data,
        );

        this.unidades.set(
          respuesta.unidades.data.filter(
            (unidad) =>
              unidad.estado === 'DISPONIBLE',
          ),
        );

        this.cargando.set(false);
      },
      error: (error) => {
        console.error(
          'Error al cargar mantenimientos:',
          error,
        );

        this.mensajeError.set(
          error.error?.message ||
            'No fue posible cargar la información de mantenimiento',
        );

        this.cargando.set(false);
      },
    });
  }

  registrarMantenimiento(): void {
    if (this.formularioMantenimiento.invalid) {
      this.formularioMantenimiento.markAllAsTouched();
      return;
    }

    const formulario =
      this.formularioMantenimiento.getRawValue();

    const datos: CrearMantenimientoRequest = {
      unidadId: formulario.unidadId,
      fechaInicio: formulario.fechaInicio,
      descripcion: formulario.descripcion.trim(),
      costo: Number(formulario.costo),
    };

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.mantenimientosService
      .registrar(datos)
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.formularioMantenimiento.reset({
            unidadId: 0,
            fechaInicio: this.obtenerFechaActual(),
            descripcion: '',
            costo: 0,
          });

          this.guardando.set(false);
          this.cargarDatos();
        },
        error: (error) => {
          console.error(
            'Error al registrar mantenimiento:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible registrar el mantenimiento',
          );

          this.guardando.set(false);
        },
      });
  }

  finalizarMantenimiento(
    mantenimiento: Mantenimiento,
  ): void {
    if (mantenimiento.estado === 'FINALIZADO') {
      return;
    }

    const fechaFin = this.obtenerFechaActual();

    this.finalizandoId.set(mantenimiento.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.mantenimientosService
      .finalizar(
        mantenimiento.id,
        {
          fechaFin,
        },
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.finalizandoId.set(null);
          this.cargarDatos();
        },
        error: (error) => {
          console.error(
            'Error al finalizar mantenimiento:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible finalizar el mantenimiento',
          );

          this.finalizandoId.set(null);
        },
      });
  }
formatearCosto(costo: string): string {
  return Number(costo).toFixed(2);
}
  private obtenerFechaActual(): string {
    const fecha = new Date();

    const diferenciaZonaHoraria =
      fecha.getTimezoneOffset() * 60_000;

    return new Date(
      fecha.getTime() - diferenciaZonaHoraria,
    )
      .toISOString()
      .slice(0, 10);
  }
}