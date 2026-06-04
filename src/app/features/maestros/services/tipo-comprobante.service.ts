import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';
import { TipoComprobanteDTO } from '../../../core/models/tipo-comprobante.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Tipos de Comprobante.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD y
 * consultas de los documentos contables estandarizados por SUNAT (ej. Boleta, Factura).
 */
@Injectable({
  providedIn: 'root'
})
export class TipoComprobanteService {

  /** Inyección moderna del cliente HTTP. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de tipos de comprobante de la API. */
  private readonly URL = `${environment.apiUrl}/tipos-comprobante`;

  /**
   * @description Obtiene una lista paginada de tipos de comprobante, soportando filtrado por texto.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados.
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<TipoComprobanteDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<TipoComprobanteDTO>>(this.URL, { params });
  }

  /**
   * @description Obtiene una lista ligera y optimizada de comprobantes (usualmente solo activos)
   * para poblar selectores desplegables en los módulos de ventas o compras.
   * @returns Observable con el arreglo de comprobantes básicos.
   */
  listarParaCombo(): Observable<TipoComprobanteDTO[]> {
    return this.http.get<TipoComprobanteDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de un tipo de comprobante mediante su ID.
   * @param id Identificador único del comprobante.
   * @returns Observable con los datos solicitados.
   */
  buscarPorId(id: number): Observable<TipoComprobanteDTO> {
    return this.http.get<TipoComprobanteDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Recupera un tipo de comprobante específico buscando por su código oficial de SUNAT.
   * @param codigo Código SUNAT a buscar (ej. "01", "03").
   * @returns Observable con los datos del comprobante encontrado.
   */
  buscarPorCodigoSunat(codigo: string): Observable<TipoComprobanteDTO> {
    return this.http.get<TipoComprobanteDTO>(`${this.URL}/sunat/${codigo}`);
  }

  /**
   * @description Registra un nuevo tipo de comprobante en el sistema.
   * @param dto Objeto DTO con los datos del nuevo comprobante.
   * @returns Observable con el comprobante recién creado.
   */
  crear(dto: TipoComprobanteDTO): Observable<TipoComprobanteDTO> {
    return this.http.post<TipoComprobanteDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de un comprobante existente.
   * @param id Identificador único a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el comprobante modificado.
   */
  actualizar(id: number, dto: TipoComprobanteDTO): Observable<TipoComprobanteDTO> {
    return this.http.put<TipoComprobanteDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de un comprobante en el sistema.
   * @param id Identificador único del comprobante a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
