import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { CajaSesionDTO, CajaSesionRequestDTO } from '../../../core/models/caja-sesion.dto';

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  private http = inject(HttpClient);
  private readonly URL = `${environment.apiUrl}/cajas`;

  /**
   * @description Verifica si el usuario autenticado tiene una sesión de caja ABIERTA.
   * Retorna 200 con el objeto si existe, o 204 (No Content) si no tiene caja.
   */
  obtenerMiCajaActiva(): Observable<CajaSesionDTO | null> {
    return this.http.get<CajaSesionDTO | null>(`${this.URL}/mi-estado`);
  }

  /**
   * @description Inicia una nueva sesión de caja para el turno actual.
   */
  aperturarCaja(dto: CajaSesionRequestDTO): Observable<CajaSesionDTO> {
    return this.http.post<CajaSesionDTO>(`${this.URL}/aperturar`, dto);
  }
}
