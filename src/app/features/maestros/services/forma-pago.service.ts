import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { FormaPagoDTO } from '../../../core/models/forma-pago.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Formas de Pago en HardPC.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD
 * sobre los métodos aceptados en el sistema de ventas (ej. Efectivo, Tarjeta, Yape, Plin).
 */
@Injectable({
  providedIn: 'root'
})
export class FormaPagoService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de formas de pago en la API. */
  private readonly URL = `${environment.apiUrl}/formas-pago`;

  /**
   * @description Obtiene una lista paginada de formas de pago, soportando filtrado por texto.
   * Ideal para la tabla principal de administración de configuraciones.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados.
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<FormaPagoDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<FormaPagoDTO>>(this.URL, { params });
  }

  /**
   * @description Obtiene una lista ligera y optimizada (usualmente registros activos)
   * para poblar selectores (combobox) en el módulo de facturación y ventas de HardPC.
   * @returns Observable con el arreglo de formas de pago disponibles.
   */
  listarParaCombo(): Observable<FormaPagoDTO[]> {
    return this.http.get<FormaPagoDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de una forma de pago mediante su identificador.
   * @param id Identificador único de la forma de pago.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<FormaPagoDTO> {
    return this.http.get<FormaPagoDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra una nueva forma de pago en el sistema.
   * @param dto Objeto DTO con los datos del nuevo método de pago.
   * @returns Observable con el registro recién creado.
   */
  crear(dto: FormaPagoDTO): Observable<FormaPagoDTO> {
    return this.http.post<FormaPagoDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de una forma de pago existente.
   * También se utiliza en la interfaz para ejecutar la restauración (reactivación) de registros.
   * @param id Identificador único de la forma de pago a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el registro modificado.
   */
  actualizar(id: number, dto: FormaPagoDTO): Observable<FormaPagoDTO> {
    return this.http.put<FormaPagoDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de una forma de pago en el sistema.
   * @param id Identificador único a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
