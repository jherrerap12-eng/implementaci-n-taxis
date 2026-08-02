import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  Piloto,
  PilotosService,
} from '../../services/pilotos';
import {
  CrearRegistroDiarioRequest,
  RegistrarCombustibleRequest,
  RegistroDiario,
  RegistrosDiariosService,
  ResultadoCombustible,
} from '../../services/registros-diarios';
import {
  Unidad,
  UnidadesService,
} from '../../services/unidades';

@Component({
  selector: 'app-registro-diario',
  imports: [ReactiveFormsModule],
  templateUrl: './registro-diario.html',
  styleUrl: './registro-diario.scss',
})
export class RegistroDiarioComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pilotosService = inject(PilotosService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly registrosService = inject(RegistrosDiariosService);
  private readonly rutaActiva = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly pilotos = signal<Piloto[]>([]);
  readonly unidades = signal<Unidad[]>([]);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly guardandoCombustible = signal(false);

  readonly kilometrajeInicial = signal<number | null>(null);
  readonly montoCombustible = signal(0);

  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly registroCreado = signal<RegistroDiario | null>(null);
  readonly resultadoCombustible =
    signal<ResultadoCombustible | null>(null);

  readonly formularioRegistro = this.formBuilder.nonNullable.group({
    pilotoId: [
      0,
      [
        Validators.required,
        Validators.min(1),
      ],
    ],

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

    kilometrajeFinal: [
      0,
      [
        Validators.required,
        Validators.min(0),
      ],
    ],

    montoLiquidado: [
      0,
      [
        Validators.required,
        Validators.min(0),
      ],
    ],

    observaciones: [''],
  });

  readonly formularioCombustible =
    this.formBuilder.nonNullable.group({
      sinCombustible: [false],

      galones: [
        0,
        [
          Validators.min(0),
        ],
      ],

      precioGalon: [
        0,
        [
          Validators.min(0),
        ],
      ],
    });

  ngOnInit(): void {
    const registroId = Number(
      this.rutaActiva.snapshot.queryParamMap.get('registroId'),
    );

    if (Number.isInteger(registroId) && registroId > 0) {
      this.cargarRegistroPendiente(registroId);
      return;
    }

    this.cargarCatalogos();
  }

  cargarRegistroPendiente(registroId: number): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.registrosService.obtenerPorId(registroId).subscribe({
      next: (respuesta) => {
        const registro = respuesta.data;

        if (registro.estado !== 'PENDIENTE_COMBUSTIBLE') {
          this.cargarCatalogos();

          this.mensajeError.set(
            'Esta operación ya fue completada y no tiene combustible pendiente',
          );

          return;
        }

        this.registroCreado.set(registro);
        this.resultadoCombustible.set(null);
        this.kilometrajeInicial.set(
          registro.kilometrajeInicial,
        );

        this.formularioCombustible.reset({
          sinCombustible: false,
          galones: 0,
          precioGalon: 0,
        });

        this.montoCombustible.set(0);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error(
          'Error al recuperar el registro pendiente:',
          error,
        );

        this.cargarCatalogos();

        this.mensajeError.set(
          error.error?.message ||
            'No fue posible recuperar la operación pendiente',
        );
      },
    });
  }

  cargarCatalogos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    forkJoin({
      pilotos: this.pilotosService.obtenerPilotos(),
      unidades: this.unidadesService.obtenerUnidades(),
    }).subscribe({
      next: (respuesta) => {
        this.pilotos.set(
          respuesta.pilotos.data.filter(
            (piloto) => piloto.estado === 'ACTIVO',
          ),
        );

        this.unidades.set(
          respuesta.unidades.data.filter(
            (unidad) => unidad.estado === 'DISPONIBLE',
          ),
        );

        this.cargando.set(false);
      },
      error: (error) => {
        console.error(
          'Error al cargar pilotos y unidades:',
          error,
        );

        this.mensajeError.set(
          'No fue posible cargar los pilotos y las unidades',
        );

        this.cargando.set(false);
      },
    });
  }

  seleccionarUnidad(): void {
    const unidadId =
      this.formularioRegistro.controls.unidadId.value;

    const unidadSeleccionada = this.unidades().find(
      (unidad) => unidad.id === unidadId,
    );

    if (!unidadSeleccionada) {
      this.kilometrajeInicial.set(null);

      this.formularioRegistro.controls.kilometrajeFinal.setValue(
        0,
      );

      return;
    }

    this.kilometrajeInicial.set(
      unidadSeleccionada.kilometrajeActual,
    );

    this.formularioRegistro.controls.kilometrajeFinal.setValue(
      unidadSeleccionada.kilometrajeActual,
    );
  }

  registrar(): void {
    if (this.formularioRegistro.invalid) {
      this.formularioRegistro.markAllAsTouched();
      return;
    }

    const kilometrajeInicial = this.kilometrajeInicial();
    const datosFormulario =
      this.formularioRegistro.getRawValue();

    if (kilometrajeInicial === null) {
      this.mensajeError.set(
        'Selecciona una unidad válida',
      );

      return;
    }

    if (
      datosFormulario.kilometrajeFinal <
      kilometrajeInicial
    ) {
      this.mensajeError.set(
        'El kilometraje final no puede ser menor al kilometraje inicial',
      );

      return;
    }

    const datos: CrearRegistroDiarioRequest = {
      pilotoId: datosFormulario.pilotoId,
      unidadId: datosFormulario.unidadId,
      fecha: datosFormulario.fecha,
      kilometrajeFinal:
        datosFormulario.kilometrajeFinal,
      montoLiquidado:
        datosFormulario.montoLiquidado,
      observaciones:
        datosFormulario.observaciones,
    };

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.registrosService.registrar(datos).subscribe({
      next: (respuesta) => {
        this.registroCreado.set(respuesta.data);
        this.mensajeExito.set(respuesta.message);
        this.guardando.set(false);
      },
      error: (error) => {
        console.error(
          'Error al guardar el registro diario:',
          error,
        );

        this.mensajeError.set(
          error.error?.message ||
            'No fue posible guardar el registro diario',
        );

        this.guardando.set(false);
      },
    });
  }

  calcularMontoCombustible(): void {
    const formulario =
      this.formularioCombustible.getRawValue();

    if (formulario.sinCombustible) {
      this.montoCombustible.set(0);
      return;
    }

    const galones = Number(formulario.galones);
    const precioGalon = Number(formulario.precioGalon);

    if (
      !Number.isFinite(galones) ||
      !Number.isFinite(precioGalon) ||
      galones <= 0 ||
      precioGalon <= 0
    ) {
      this.montoCombustible.set(0);
      return;
    }

    const monto = galones * precioGalon;

    this.montoCombustible.set(
      Number(monto.toFixed(2)),
    );
  }

  cambiarSinCombustible(): void {
    const sinCombustible =
      this.formularioCombustible.controls
        .sinCombustible.value;

    this.mensajeError.set('');

    if (sinCombustible) {
      this.formularioCombustible.patchValue({
        galones: 0,
        precioGalon: 0,
      });

      this.montoCombustible.set(0);
    }
  }

  registrarCombustible(): void {
    const registro = this.registroCreado();

    if (!registro) {
      this.mensajeError.set(
        'Primero debes guardar el registro diario',
      );

      return;
    }

    const formulario =
      this.formularioCombustible.getRawValue();

    let datos: RegistrarCombustibleRequest;

    if (formulario.sinCombustible) {
      datos = {
        sinCombustible: true,
      };
    } else {
      const galones = Number(formulario.galones);
      const precioGalon = Number(formulario.precioGalon);

      if (
        !Number.isFinite(galones) ||
        !Number.isFinite(precioGalon) ||
        galones <= 0 ||
        precioGalon <= 0
      ) {
        this.mensajeError.set(
          'Ingresa los galones y el precio por galón',
        );

        return;
      }

      const monto = Number(
        (galones * precioGalon).toFixed(2),
      );

      datos = {
        sinCombustible: false,
        galones,
        precioGalon,
        monto,
      };
    }

    this.guardandoCombustible.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.registrosService
      .registrarCombustible(registro.id, datos)
      .subscribe({
        next: (respuesta) => {
          this.resultadoCombustible.set(
            respuesta.data,
          );

          this.registroCreado.set(
            respuesta.data.registro,
          );

          this.mensajeExito.set(
            respuesta.message,
          );

          this.guardandoCombustible.set(false);
        },
        error: (error) => {
          console.error(
            'Error al registrar combustible:',
            error,
          );

          this.mensajeError.set(
            error.error?.message ||
              'No fue posible registrar el combustible',
          );

          this.guardandoCombustible.set(false);
        },
      });
  }

  iniciarNuevoRegistro(): void {
    void this.router.navigate(['/registro-diario']);

    this.registroCreado.set(null);
    this.resultadoCombustible.set(null);
    this.kilometrajeInicial.set(null);
    this.montoCombustible.set(0);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.formularioRegistro.reset({
      pilotoId: 0,
      unidadId: 0,
      fecha: this.obtenerFechaActual(),
      kilometrajeFinal: 0,
      montoLiquidado: 0,
      observaciones: '',
    });

    this.formularioCombustible.reset({
      sinCombustible: false,
      galones: 0,
      precioGalon: 0,
    });

    this.cargarCatalogos();
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