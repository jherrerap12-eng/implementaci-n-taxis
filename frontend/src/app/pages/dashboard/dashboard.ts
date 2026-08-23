import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  AlertaMantenimientoDashboard,
  DashboardService,
  ResumenDashboard,
} from '../../services/dashboard';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly resumen = signal<ResumenDashboard | null>(null);

  readonly mantenimientosRequeridos =
    signal<AlertaMantenimientoDashboard[]>([]);
  readonly proximosMantenimientos =
    signal<AlertaMantenimientoDashboard[]>([]);

  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  readonly fechaActual = this.obtenerFechaActual();

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.dashboardService.obtenerDashboard().subscribe({
      next: (respuesta) => {
        this.resumen.set(respuesta.data);
        this.mantenimientosRequeridos.set(
          respuesta.data.alertasMantenimiento.requeridas,
        );
        this.proximosMantenimientos.set(
          respuesta.data.alertasMantenimiento.proximas,
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
