import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Optimización de rendimiento (El mesero agrupador)
    provideZoneChangeDetection({ eventCoalescing: true }),

    // 2. Sistema de rutas para cambiar de pantallas
    provideRouter(routes),

    // 3. Cliente HTTP nativo para consumir la API de HardPC
    provideHttpClient(withInterceptors([]))
  ]
};
