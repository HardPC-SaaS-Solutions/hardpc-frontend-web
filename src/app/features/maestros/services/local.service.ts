import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';
import { LocalDTO } from '../../../core/models/local.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Locales en el sistema de HardPC.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD y
 * consultas de las sucursales físicas o almacenes de la empresa.
 */
@Injectable({
  providedIn: 'root'
})
export class LocalService {

  /** Inyección moderna del cliente HTTP. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de locales de la API. */
  private readonly URL = `${environment.apiUrl}/locales`;

  /**
   * @description Obtiene una lista paginada de locales, soportando filtrado por texto.
   * Ideal para tablas de datos que manejan la lista de sucursales.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados (ej. por nombre o dirección).
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<LocalDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<LocalDTO>>(this.URL, { params });
  }

  /**
   * @description Obtiene una lista ligera y optimizada de locales (usualmente solo activos)
   * para poblar selectores desplegables (combobox) en asignaciones de inventario o usuarios.
   * @returns Observable con el arreglo de locales básicos.
   */
  listarParaCombo(): Observable<LocalDTO[]> {
    return this.http.get<LocalDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de un local mediante su identificador.
   * @param id Identificador único del local.
   * @returns Observable con los datos del local solicitado.
   */
  buscarPorId(id: number): Observable<LocalDTO> {
    return this.http.get<LocalDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra un nuevo local o sucursal en el sistema.
   * @param dto Objeto DTO con los datos del nuevo local.
   * @returns Observable con el local recién creado (incluyendo el ID asignado por el backend).
   */
  crear(dto: LocalDTO): Observable<LocalDTO> {
    return this.http.post<LocalDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de un local existente.
   * También se utiliza en el frontend para ejecutar la restauración (reactivación) de registros.
   * @param id Identificador único del local a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el local modificado.
   */
  actualizar(id: number, dto: LocalDTO): Observable<LocalDTO> {
    return this.http.put<LocalDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de un local en el sistema.
   * @param id Identificador único del local a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
