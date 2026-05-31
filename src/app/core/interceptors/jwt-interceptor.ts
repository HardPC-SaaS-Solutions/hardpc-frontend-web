import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * @description Interceptor HTTP funcional para el sistema administrativo de HardPC.
 * Adjunta automáticamente el token JWT a las cabeceras de todas las peticiones
 * salientes hacia la API, garantizando la identidad del usuario en cada transacción.
 * * @param req Petición HTTP original en curso.
 * @param next Función delegada para pasar la petición al siguiente manejador en la cadena.
 * @returns Un flujo observable del evento HTTP.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyección del servicio de autenticación para extraer el token almacenado localmente.
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si existe una sesión activa, se clona la petición inmutable para inyectar la credencial.
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    // Propaga la petición hacia el servidor con la cabecera de autorización autorizada.
    return next(clonedRequest);
  }

  // Si no hay token (ej. durante la autenticación inicial o consultas a rutas públicas),
  // la petición original continúa su flujo sin modificaciones.
  return next(req);
};
