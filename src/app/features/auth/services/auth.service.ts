import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { AuthLoginRequestDTO } from '../../../core/models/auth-login-request.dto';
import { AuthResponseDTO } from '../../../core/models/auth-response.dto';

/**
 * @description Servicio centralizado de autenticación y seguridad para el ERP HardPC.
 * Gestiona la comunicación con la API para el inicio de sesión, el ciclo de vida
 * del token JWT y provee utilidades para el Control de Acceso Basado en Roles (RBAC) en el frontend.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /** Endpoint base para las operaciones de seguridad y autenticación. */
  private readonly URL = `${environment.apiUrl}/auth`;

  /** Clave de LocalStorage reservada estandarizada para el token JWT. */
  private readonly TOKEN_KEY = 'hardpc_jwt_token';

  /** Clave de LocalStorage reservada para cachear los metadatos de la sesión del usuario. */
  private readonly USER_KEY = 'hardpc_user_data';

  /**
   * @description Inicializa el servicio de autenticación.
   * @param http Cliente para peticiones HTTP de Angular.
   */
  constructor(private http: HttpClient) { }

  /**
   * @description Procesa la autenticación del usuario contra el backend.
   * ✨ Patrón Reactivo: Utiliza el operador `tap` para interceptar la respuesta exitosa
   * y persistir automáticamente la sesión en el navegador antes de propagar el observable al componente.
   * @param credentials Objeto DTO con las credenciales (username y password).
   * @returns Observable con el payload de respuesta de autenticación.
   */
  login(credentials: AuthLoginRequestDTO): Observable<AuthResponseDTO> {
    return this.http.post<AuthResponseDTO>(`${this.URL}/login`, credentials).pipe(
      tap((response: AuthResponseDTO) => {
        this.guardarSesion(response);
      })
    );
  }

  /**
   * @description Persiste el token JWT y los metadatos del usuario autenticado en LocalStorage.
   * Almacena solo la información estrictamente necesaria para la UI y la validación de roles.
   * @param response Objeto devuelto por el servidor tras un login exitoso.
   */
  private guardarSesion(response: AuthResponseDTO): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);

    // Serialización del subconjunto de datos requeridos para la UI y control de accesos.
    const userData = {
      email: response.email,
      nombreCompleto: response.nombreCompleto,
      rol: response.rol
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
  }

  /**
   * @description Recupera el token JWT actual de la sesión.
   * Utilizado principalmente por los Interceptors HTTP para inyectar el Bearer Token en cada petición.
   * @returns El token en formato string, o null si la sesión no existe o expiró.
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * @description Evalúa el estado actual de autenticación comprobando la existencia del token.
   * Utilizado extensamente por los AuthGuards de Angular para proteger rutas privadas.
   * @returns `true` si el token existe, `false` en caso contrario.
   */
  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  /**
   * @description Invalida la sesión actual purgando de forma segura las credenciales
   * y metadatos cacheados en el almacenamiento local del navegador.
   * TODO: Implementar inyección de Router para delegar la redirección a la vista de login.
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * @description Obtiene el identificador del rol (ej. 'ROLE_ADMIN') del usuario actualmente logueado.
   * Implementa un bloque try/catch para prevenir rupturas de la aplicación si los datos
   * en LocalStorage son manipulados externamente o se corrompen.
   * @returns El rol actual como cadena de texto, o null en caso de error o ausencia de sesión.
   */
  getRolActual(): string | null {
    const userDataStr = localStorage.getItem(this.USER_KEY);
    if (!userDataStr) return null;
    try {
      const userData = JSON.parse(userDataStr);
      return userData.rol;
    } catch (e) {
      return null;
    }
  }

  /**
   * @description Verifica condicionalmente si el usuario actual posee privilegios jerárquicos elevados.
   * Utilizado a nivel de directivas estructurales (*ngIf) en la UI para renderizar u ocultar
   * botones de acciones destructivas (como eliminar registros o modificar roles críticos).
   * @returns `true` si el rol es ADMIN o SUPERVISOR, `false` para roles operativos o cajeros.
   */
  esAdminOSupervisor(): boolean {
    const rol = this.getRolActual();
    return rol === 'ROLE_ADMIN' || rol === 'ROLE_SUPERVISOR';
  }
}
