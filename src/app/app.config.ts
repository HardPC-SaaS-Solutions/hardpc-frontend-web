import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// 1. Importamos el nuevo motor de PrimeNG y tu tema elegido (Lara)
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([])),

    // 2. Encendemos PrimeNG con el tema configurado
    providePrimeNG({
        theme: {
            preset: Lara
        }
    })
  ]
};
