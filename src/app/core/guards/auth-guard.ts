import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * @description Guardián de rutas funcional para el sistema HardPC.
 * Actúa como middleware de seguridad interceptando la navegación hacia módulos
 * protegidos del ERP (inventario, ventas, etc.) y verificando la autorización.
 * * @param route Información sobre la ruta a la que el usuario intenta acceder.
 * @param state Estado actual del árbol de enrutamiento.
 * @returns `true` si el usuario está autenticado; de lo contrario, redirige y retorna `false`.
 */
export const authGuard: CanActivateFn = (route, state) => {
  // Inyección de dependencias moderna para acceder al servicio de autenticación y al enrutador.
  const authService = inject(AuthService);
  const router = inject(Router);

  // Validación del estado de la sesión mediante la existencia de un token JWT válido.
  if (authService.isLoggedIn()) {
    // Autorización concedida: Permite la carga y renderizado del componente protegido.
    return true;
  } else {
    // Autorización denegada: Bloquea el acceso y fuerza la redirección al punto de entrada público.
    router.navigate(['/login']);
    return false; 
  }
};
