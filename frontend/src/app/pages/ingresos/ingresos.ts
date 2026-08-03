import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  IngresosService,
  ResumenIngresos,
} from '../../services/ingresos';

type PeriodoDias = 1 | 7 | 15 | 30;

@Component({
  selector: 'app-ingresos',
  imports: [ReactiveFormsModule],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.scss',
})
export class Ingresos implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly ingresosService = inject(IngresosService);

  readonly resumen = signal<ResumenIngresos | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly periodoSeleccionado = signal<PeriodoDias>(1);

  readonly formularioConsulta =
    this.formBuilder.nonNullable.group({
      fechaFin: [
        this.obtenerFechaActual(),
        Validators.required,
      ],
    });

  ngOnInit(): void {
    this.consultarIngresos();
  }

  seleccionarPeriodo(dias: PeriodoDias): void {
    this.periodoSeleccionado.set(dias);
    this.consultarIngresos();
  }

  consultarIngresos(): void {
    if (this.formularioConsulta.invalid) {
      this.formularioConsulta.markAllAsTouched();
      return;
    }

    const dias = this.periodoSeleccionado();
    const fechaFin =
      this.formularioConsulta.controls.fechaFin.value;

    this.cargando.set(true);
    this.mensajeError.set('');

    this.ingresosService
      .obtenerIngresos(dias, fechaFin)
      .subscribe({
        next: (respuesta) => {
          this.resumen.set(respuesta.data);
          this.cargando.set(false);
        },
        error: (error) => {
          console.error(
            'Error al consultar los ingresos:',
            error,
          );

          this.resumen.set(null);

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible consultar los ingresos',
          );

          this.cargando.set(false);
        },
      });
  }

  obtenerEtiquetaPeriodo(): string {
    const dias = this.periodoSeleccionado();

    if (dias === 1) {
      return 'Hoy';
    }

    return `Últimos ${dias} días`;
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