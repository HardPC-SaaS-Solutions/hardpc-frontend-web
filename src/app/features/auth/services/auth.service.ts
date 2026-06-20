import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { AuthLoginRequestDTO } from '../../../core/models/auth-login-request.dto';
import { AuthResponseDTO } from '../../../core/models/auth-response.dto';

/**
 * @description Servicio centralizado de autenticación y seguridad para el ERP HardPC.
 * Gestiona la comunicación con la API para el inicio de sesión, el ciclo de vida
 * del token JWT (incluyendo validación de caducidad nativa) y provee utilidades
 * robustas para el Control de Acceso Basado en Roles (RBAC) en la interfaz.
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

  // Inyección de dependencias moderna para red y navegación
  private http = inject(HttpClient);
  private router = inject(Router);

  /**
   * @description Procesa la autenticación del usuario contra el backend.
   * ✨ Patrón Reactivo: Utiliza el operador `tap` para interceptar la respuesta exitosa
   * y persistir automáticamente la sesión en el navegador antes de notificar al componente.
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
   * Filtra y almacena estrictamente lo necesario para la UI.
   * @param response Objeto devuelto por el servidor tras un login exitoso.
   */
  private guardarSesion(response: AuthResponseDTO): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);

    const userData = {
      email: response.email,
      nombreCompleto: response.nombreCompleto,
      rol: response.rol
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
  }

  /**
   * @description Recupera el token JWT actual de la sesión.
   * @returns El token en formato string, o null si la sesión no existe.
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * @description Obtiene los datos públicos y metadatos del usuario logueado.
   * Útil para personalizar la interfaz, mostrar el nombre en el Navbar o el header del sistema.
   * @returns Objeto con los datos del usuario, o null si están corruptos o no existen.
   */
  getUsuarioActual(): any | null {
    const userDataStr = localStorage.getItem(this.USER_KEY);
    if (!userDataStr) return null;
    try {
      return JSON.parse(userDataStr);
    } catch (e) {
      return null;
    }
  }

  /**
   * @description Evalúa el estado de autenticación comprobando la existencia
   * y la vigencia temporal (expiración) del token JWT.
   * ✨ Optimización: Expulsa automáticamente al usuario si el token ha caducado.
   * @returns `true` si hay sesión válida y no expirada, `false` en caso contrario.
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Validación proactiva de caducidad del JWT para evitar llamadas HTTP fallidas (401)
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * @description Desencripta el payload del JWT de forma nativa (sin librerías externas)
   * para evaluar matemáticamente la fecha límite de expiración ('exp').
   * @param token Cadena JWT a evaluar.
   * @returns Verdadero si el tiempo actual superó la vida útil del token.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = JSON.parse(atob(payloadBase64));
      const exp = payloadDecoded.exp;

      // Compara el timestamp actual en segundos con el 'exp' del JWT
      return (Math.floor((new Date).getTime() / 1000)) >= exp;
    } catch (e) {
      return true; // Ante cualquier anomalía criptográfica, invalidamos por seguridad
    }
  }

  /**
   * @description Destruye la sesión actual purgando de forma segura las credenciales
   * del almacenamiento local y redirige de inmediato a la frontera de seguridad (Login).
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    // Redirección forzada para limpiar el estado de la aplicación
    this.router.navigate(['/login']);
  }

  /**
   * @description Recupera el identificador de seguridad (ej. 'ROLE_ADMIN') del usuario activo.
   * @returns El rol actual como cadena de texto, o null si la sesión no es válida.
   */
  getRolActual(): string | null {
    const usuario = this.getUsuarioActual();
    return usuario ? usuario.rol : null;
  }

  // ======================================================================
  // --- MÉTODOS DE CONTROL DE ACCESO BASADO EN ROLES (RBAC) ---
  // ======================================================================

  /**
   * @description Verifica si la sesión posee credenciales jerárquicas superiores.
   * Habilita accesos a reportes financieros, catálogos maestros y acciones destructivas.
   * @returns Verdadero si es Administrador o Supervisor.
   */
  esAdminOSupervisor(): boolean {
    const rol = this.getRolActual();
    return rol === 'ROLE_ADMIN' || rol === 'ROLE_SUPERVISOR';
  }

  /**
   * @description Determina si el usuario actual pertenece al personal de almacén/operaciones.
   * Habilita el módulo de Kardex y gestión de existencias.
   * @returns Verdadero si el rol es Operativo.
   */
  esOperativo(): boolean {
    return this.getRolActual() === 'ROLE_OPERATIVO';
  }

  /**
   * @description Determina si el usuario actual opera en el Punto de Venta (POS).
   * Habilita los módulos de facturación y gestión de caja diaria.
   * @returns Verdadero si el rol es Cajero.
   */
  esCajero(): boolean {
    return this.getRolActual() === 'ROLE_CAJERO';
  }
}
