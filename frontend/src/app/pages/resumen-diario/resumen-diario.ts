import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import {
  RegistroDiario,
  ResumenDiario as ResumenDiarioDatos,
  RegistrosDiariosService,
} from '../../services/registros-diarios';

@Component({
  selector: 'app-resumen-diario',
  imports: [ReactiveFormsModule],
  templateUrl: './resumen-diario.html',
  styleUrl: './resumen-diario.scss',
})
export class ResumenDiarioComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly registrosService = inject(
    RegistrosDiariosService,
  );
  private readonly router = inject(Router);

  readonly resumen = signal<ResumenDiarioDatos | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  readonly formularioConsulta =
    this.formBuilder.nonNullable.group({
      fecha: [
        this.obtenerFechaActual(),
        Validators.required,
      ],
    });

  ngOnInit(): void {
    this.consultarResumen();
  }

  consultarResumen(): void {
    if (this.formularioConsulta.invalid) {
      this.formularioConsulta.markAllAsTouched();
      return;
    }

    const fecha =
      this.formularioConsulta.controls.fecha.value;

    this.cargando.set(true);
    this.mensajeError.set('');

    this.registrosService.obtenerResumen(fecha).subscribe({
      next: (respuesta) => {
        this.resumen.set(respuesta.data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error(
          'Error al consultar el resumen diario:',
          error,
        );

        this.resumen.set(null);

        this.mensajeError.set(
          error.error?.message ||
            'No fue posible consultar el resumen diario',
        );

        this.cargando.set(false);
      },
    });
  }

  continuarCombustible(registroId: number): void {
    void this.router.navigate(
      ['/registro-diario'],
      {
        queryParams: {
          registroId,
        },
      },
    );
  }

  obtenerKilometrosRecorridos(
    registro: RegistroDiario,
  ): number {
    return (
      registro.kilometrajeFinal -
      registro.kilometrajeInicial
    );
  }

  obtenerMontoCombustible(
    registro: RegistroDiario,
  ): number {
    return (registro.cargasCombustible ?? []).reduce(
      (total, carga) => total + Number(carga.monto),
      0,
    );
  }

  obtenerGalones(
    registro: RegistroDiario,
  ): number {
    return (registro.cargasCombustible ?? []).reduce(
      (total, carga) => total + Number(carga.galones),
      0,
    );
  }

  tieneCombustible(
    registro: RegistroDiario,
  ): boolean {
    return (registro.cargasCombustible?.length ?? 0) > 0;
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