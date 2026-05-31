import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';

// Integración del motor principal de PrimeNG y su preajuste visual.
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';

/**
 * @description Configuración global (Standalone) para la aplicación Angular de HardPC.
 * Centraliza la inyección de dependencias críticas: optimización de renderizado,
 * enrutamiento, cliente HTTP seguro y la capa de diseño UI.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Optimiza el rendimiento de la detección de cambios en Angular agrupando eventos concurrentes.
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Inicializa el sistema de enrutamiento base del ERP.
    provideRouter(routes),

    // Habilita el cliente HTTP y registra el interceptor JWT para autenticar todas las peticiones a la API.
    provideHttpClient(withInterceptors([jwtInterceptor])),

    // Inicializa la configuración global de PrimeNG, estableciendo 'Lara' como la línea gráfica oficial del sistema.
    providePrimeNG({
        theme: {
            preset: Lara
        }
    })
  ]
};
