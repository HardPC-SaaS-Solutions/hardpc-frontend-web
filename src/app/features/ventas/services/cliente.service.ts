import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ClienteDTO } from '../../../core/models/cliente.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Clientes en el sistema de HardPC.
 * Administra la comunicación HTTP para el registro y control del directorio comercial,
 * abarcando tanto a personas naturales como a personas jurídicas (empresas).
 */
@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de clientes en la API. */
  private readonly URL = `${environment.apiUrl}/clientes`;

  /**
   * @description Obtiene una lista paginada de clientes, soportando búsquedas dinámicas y
   * segmentación específica por tipo de cliente corporativo o natural.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional (nombres, apellidos, razón social o documento).
   * @param tipoCliente Identificador opcional del enum (ej. 'PERSONA_NATURAL', 'EMPRESA') para filtrar la vista.
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = '', tipoCliente?: string): Observable<PageResponseDTO<ClienteDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    if (tipoCliente) {
      params = params.set('tipoCliente', tipoCliente);
    }

    return this.http.get<PageResponseDTO<ClienteDTO>>(this.URL, { params });
  }

  /**
   * @description Recupera los detalles completos de un cliente específico mediante su identificador.
   * @param id Identificador único del cliente.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<ClienteDTO> {
    return this.http.get<ClienteDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra un nuevo cliente en el directorio comercial del sistema.
   * @param dto Objeto DTO con los datos del nuevo cliente.
   * @returns Observable con el registro recién creado.
   */
  crear(dto: ClienteDTO): Observable<ClienteDTO> {
    return this.http.post<ClienteDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de un cliente existente.
   * @param id Identificador único del cliente a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el registro modificado.
   */
  actualizar(id: number, dto: ClienteDTO): Observable<ClienteDTO> {
    return this.http.put<ClienteDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de un cliente,
   * inhabilitándolo para la generación de nuevos comprobantes de venta.
   * @param id Identificador único a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }

  /**
   * @description Reactiva un cliente previamente desactivado.
   * ✨ Optimización Arquitectónica: Emplea una petición PATCH ligera para
   * actualizar exclusivamente el estado lógico (booleano), reduciendo la carga de red.
   * @param id Identificador único del cliente a reactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  reactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.URL}/${id}/reactivar`, null);
  }
}
