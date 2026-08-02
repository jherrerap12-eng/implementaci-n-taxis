import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  CrearPilotoRequest,
  Piloto,
  PilotosService,
} from '../../services/pilotos';

@Component({
  selector: 'app-pilotos',
  imports: [ReactiveFormsModule],
  templateUrl: './pilotos.html',
  styleUrl: './pilotos.scss',
})
export class Pilotos implements OnInit {
  private readonly pilotosService = inject(PilotosService);
  private readonly formBuilder = inject(FormBuilder);

  readonly pilotos = signal<Piloto[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mostrarFormulario = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  readonly formularioPiloto = this.formBuilder.nonNullable.group({
    codigo: ['', Validators.required],
    nombreCompleto: ['', Validators.required],
    telefono: [''],
    numeroLicencia: ['', Validators.required],
    vencimientoLicencia: ['', Validators.required],
    observaciones: [''],
  });

  ngOnInit(): void {
    this.cargarPilotos();
  }

  cargarPilotos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.pilotosService.obtenerPilotos().subscribe({
      next: (respuesta) => {
        this.pilotos.set(respuesta.data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al obtener pilotos:', error);
        this.mensajeError.set('No fue posible cargar los pilotos');
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
    this.formularioPiloto.reset();
    this.mostrarFormulario.set(false);
  }

  registrarPiloto(): void {
    if (this.formularioPiloto.invalid) {
      this.formularioPiloto.markAllAsTouched();
      return;
    }

    const datos: CrearPilotoRequest = this.formularioPiloto.getRawValue();

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.pilotosService.registrarPiloto(datos).subscribe({
      next: (respuesta) => {
        this.mensajeExito.set(respuesta.message);
        this.guardando.set(false);
        this.formularioPiloto.reset();
        this.mostrarFormulario.set(false);
        this.cargarPilotos();
      },
      error: (error) => {
        console.error('Error al registrar piloto:', error);

        this.mensajeError.set(
          error.error?.message || 'No fue posible registrar el piloto',
        );

        this.guardando.set(false);
      },
    });
  }
}