import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  CrearGastoRequest,
  Gasto,
  GastosService,
  TipoGasto,
} from '../../services/gastos';

import {
  Unidad,
  UnidadesService,
} from '../../services/unidades';

@Component({
  selector: 'app-gastos',
  imports: [ReactiveFormsModule],
  templateUrl: './gastos.html',
  styleUrl: './gastos.scss',
})
export class Gastos implements OnInit {
  private readonly gastosService = inject(GastosService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly formBuilder = inject(FormBuilder);

  readonly gastos = signal<Gasto[]>([]);
  readonly unidades = signal<Unidad[]>([]);

  readonly cargando = signal(true);
  readonly guardando = signal(false);

  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formularioGasto =
    this.formBuilder.nonNullable.group({
      unidadId: [
        0,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],

      fecha: [
        this.obtenerFechaActual(),
        Validators.required,
      ],

      tipo: [
        'REPUESTOS_MENORES' as TipoGasto,
        Validators.required,
      ],

      descripcion: [''],

      monto: [
        0,
        [
          Validators.required,
          Validators.min(0.01),
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
      gastos:
        this.gastosService.obtenerGastos(),

      unidades:
        this.unidadesService.obtenerUnidades(),
    }).subscribe({
      next: (respuesta) => {
        this.gastos.set(
          respuesta.gastos.data,
        );

        this.unidades.set(
          respuesta.unidades.data,
        );

        this.cargando.set(false);
      },

      error: (error) => {
        console.error(
          'Error al cargar gastos:',
          error,
        );

        this.mensajeError.set(
          error.error?.message ||
            'No fue posible cargar la información de gastos',
        );

        this.cargando.set(false);
      },
    });
  }

  registrarGasto(): void {
    if (this.formularioGasto.invalid) {
      this.formularioGasto.markAllAsTouched();
      return;
    }

    const formulario =
      this.formularioGasto.getRawValue();

    const datos: CrearGastoRequest = {
      unidadId:
        formulario.unidadId,

      fecha:
        formulario.fecha,

      tipo:
        formulario.tipo,

      descripcion:
        formulario.descripcion,

      monto:
        formulario.monto,
    };

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.gastosService
      .registrarGasto(datos)
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(
            respuesta.message,
          );

          this.guardando.set(false);

          this.formularioGasto.reset({
            unidadId: 0,
            fecha: this.obtenerFechaActual(),
            tipo: 'REPUESTOS_MENORES',
            descripcion: '',
            monto: 0,
          });

          this.cargarDatos();
        },

        error: (error) => {
          console.error(
            'Error al registrar gasto:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible registrar el gasto',
          );

          this.guardando.set(false);
        },
      });
  }

  obtenerNombreTipo(tipo: TipoGasto): string {
    if (tipo === 'PINCHAZO') {
      return 'Pinchazo';
    }

    return 'Repuestos menores';
  }

  formatearMonto(monto: string): string {
    return Number(monto).toFixed(2);
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