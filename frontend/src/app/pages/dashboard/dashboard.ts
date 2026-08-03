import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  IngresosService,
  ResumenIngresos,
} from '../../services/ingresos';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly ingresosService = inject(IngresosService);

  readonly resumen = signal<ResumenIngresos | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly fechaActual = this.obtenerFechaActual();

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.ingresosService
      .obtenerIngresos(1, this.fechaActual)
      .subscribe({
        next: (respuesta) => {
          this.resumen.set(respuesta.data);
          this.cargando.set(false);
        },
        error: (error) => {
          console.error(
            'Error al cargar el dashboard:',
            error,
          );

          this.resumen.set(null);

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