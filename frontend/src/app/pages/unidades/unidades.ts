import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
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
  readonly mostrarFormulario = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formularioUnidad = this.formBuilder.nonNullable.group({
    numeroUnidad: ['', Validators.required],
    placa: ['', Validators.required],
    marca: ['', Validators.required],
    modelo: ['', Validators.required],

    anio: [
      new Date().getFullYear(),
      [
        Validators.required,
        Validators.min(1950),
        Validators.max(new Date().getFullYear() + 1),
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
        console.error('Error al obtener unidades:', error);
        this.mensajeError.set('No fue posible cargar las unidades');
        this.cargando.set(false);
      },
    });
  }

  abrirFormulario(): void {
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
      observaciones: '',
    });

    this.mostrarFormulario.set(false);
  }

  registrarUnidad(): void {
    if (this.formularioUnidad.invalid) {
      this.formularioUnidad.markAllAsTouched();
      return;
    }

    const datos: CrearUnidadRequest =
      this.formularioUnidad.getRawValue();

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.unidadesService.registrarUnidad(datos).subscribe({
      next: (respuesta) => {
        this.mensajeExito.set(respuesta.message);
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarUnidades();
      },
      error: (error) => {
        console.error('Error al registrar unidad:', error);

        this.mensajeError.set(
          error.error?.message ||
            'No fue posible registrar la unidad',
        );

        this.guardando.set(false);
      },
    });
  }
}