import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';

interface ApiHealthResponse {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);

  readonly mensaje = signal('Conectando con el backend...');
  readonly conectado = signal(false);

  ngOnInit(): void {
    this.http
      .get<ApiHealthResponse>('http://localhost:3000/api/health')
      .subscribe({
        next: (respuesta) => {
          this.mensaje.set(respuesta.message);
          this.conectado.set(respuesta.success);
        },
        error: () => {
          this.mensaje.set('No fue posible conectar con el backend');
          this.conectado.set(false);
        },
      });
  }
}