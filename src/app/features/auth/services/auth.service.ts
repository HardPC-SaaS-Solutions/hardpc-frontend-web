import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { AuthLoginRequestDTO } from '../../../core/models/auth-login-request.dto';
import { AuthResponseDTO } from '../../../core/models/auth-response.dto';

/**
 * @description Servicio centralizado de autenticación para el sistema HardPC.
 * Gestiona la comunicación con la API, el ciclo de vida del token JWT y el estado de la sesión local.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /** Endpoint base para las operaciones de autenticación. */
  private readonly URL = `${environment.apiUrl}/auth`;
  /** Clave en LocalStorage reservada para el token JWT. */
  private readonly TOKEN_KEY = 'hardpc_jwt_token';
  /** Clave en LocalStorage reservada para los metadatos del usuario. */
  private readonly USER_KEY = 'hardpc_user_data';

  /**
   * @param http Cliente para peticiones HTTP de Angular.
   */
  constructor(private http: HttpClient) { }

  /**
   * @description Procesa la autenticación del usuario. Intercepta la respuesta exitosa
   * para persistir automáticamente la sesión antes de propagar el resultado al componente.
   * @param credentials Objeto DTO con los datos de inicio de sesión.
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
   * @description Persiste de forma segura el token y los metadatos del usuario autenticado en LocalStorage.
   * @param response Objeto devuelto por el servidor tras un login exitoso.
   */
  private guardarSesion(response: AuthResponseDTO): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);

    // Serialización del subconjunto de datos requeridos para la UI y control de roles.
    const userData = {
      email: response.email,
      nombreCompleto: response.nombreCompleto,
      rol: response.rol
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
  }

  /**
   * @description Recupera el token JWT actual de la sesión.
   * @returns El token en formato string, o null si no hay sesión activa.
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * @description Evalúa el estado actual de autenticación evaluando la existencia del token.
   * @returns `true` si el token existe, `false` en caso contrario.
   */
  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  /**
   * @description Invalida la sesión actual limpiando las credenciales y datos del almacenamiento local.
   * TODO: Implementar inyección de Router para delegar la redirección a la vista de login.
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}
