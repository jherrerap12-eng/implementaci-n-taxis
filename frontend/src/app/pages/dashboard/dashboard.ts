import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  IngresosService,
  ResumenIngresos,
} from '../../services/ingresos';

import {
  Unidad,
  UnidadesService,
} from '../../services/unidades';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly ingresosService = inject(IngresosService);
  private readonly unidadesService = inject(UnidadesService);

  readonly resumen = signal<ResumenIngresos | null>(null);

  readonly mantenimientosRequeridos = signal<Unidad[]>([]);
  readonly proximosMantenimientos = signal<Unidad[]>([]);

  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  readonly fechaActual = this.obtenerFechaActual();

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    forkJoin({
      ingresos: this.ingresosService.obtenerIngresos(
        1,
        this.fechaActual,
      ),

      unidades:
        this.unidadesService.obtenerUnidades(),
    }).subscribe({
      next: (respuesta) => {
        this.resumen.set(
          respuesta.ingresos.data,
        );

        this.clasificarMantenimientos(
          respuesta.unidades.data,
        );

        this.cargando.set(false);
      },

      error: (error) => {
        console.error(
          'Error al cargar el dashboard:',
          error,
        );

        this.resumen.set(null);
        this.mantenimientosRequeridos.set([]);
        this.proximosMantenimientos.set([]);

        this.mensajeError.set(
          error.error?.message ||
            'No fue posible cargar el panel principal',
        );

        this.cargando.set(false);
      },
    });
  }

  private clasificarMantenimientos(
    unidades: Unidad[],
  ): void {
    const requeridos = unidades.filter(
      (unidad) =>
        unidad.proximoMantenimientoKm !== null &&
        unidad.kilometrajeActual >=
          unidad.proximoMantenimientoKm,
    );

    const proximos = unidades.filter(
      (unidad) => {
        if (
          unidad.proximoMantenimientoKm === null
        ) {
          return false;
        }

        const kilometrosRestantes =
          unidad.proximoMantenimientoKm -
          unidad.kilometrajeActual;

        return (
          kilometrosRestantes > 0 &&
          kilometrosRestantes <= 500
        );
      },
    );

    this.mantenimientosRequeridos.set(
      requeridos,
    );

    this.proximosMantenimientos.set(
      proximos,
    );
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