import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { MarcaDTO } from '../../../core/models/marca.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Marcas en el sistema de HardPC.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD y
 * consultas optimizadas de las marcas fabricantes de productos o repuestos.
 */
@Injectable({
  providedIn: 'root'
})
export class MarcaService {
  /** Inyección moderna del cliente HTTP. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de marcas de la API. */
  private readonly URL = `${environment.apiUrl}/marcas`;

  /**
   * @description Obtiene una lista paginada de marcas, soportando filtrado por texto.
   * Ideal para tablas de datos que manejan grandes volúmenes de información.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados (nombre).
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<MarcaDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<MarcaDTO>>(`${this.URL}`, { params });
  }

  /**
   * @description Obtiene una lista ligera y optimizada de marcas (usualmente solo activas)
   * para poblar selectores desplegables (combobox) en otras interfaces, como la creación de productos.
   * @returns Observable con el arreglo de marcas básicas.
   */
  listarParaCombo(): Observable<MarcaDTO[]> {
    return this.http.get<MarcaDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de una marca mediante su identificador.
   * @param id Identificador único de la marca.
   * @returns Observable con los datos de la marca solicitada.
   */
  buscarPorId(id: number): Observable<MarcaDTO> {
    return this.http.get<MarcaDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra una nueva marca en el catálogo del sistema.
   * @param marca Objeto DTO con los datos de la nueva marca.
   * @returns Observable con la marca recién creada (incluyendo el ID asignado por el backend).
   */
  crear(marca: MarcaDTO): Observable<MarcaDTO> {
    return this.http.post<MarcaDTO>(this.URL, marca);
  }

  /**
   * @description Actualiza integralmente la información de una marca existente.
   * También se utiliza en el frontend para ejecutar la restauración (reactivación) de registros.
   * @param id Identificador único de la marca a modificar.
   * @param marca Objeto DTO con los datos actualizados.
   * @returns Observable con la marca modificada.
   */
  actualizar(id: number, marca: MarcaDTO): Observable<MarcaDTO> {
    return this.http.put<MarcaDTO>(`${this.URL}/${id}`, marca);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de una marca en el sistema.
   * @param id Identificador único de la marca a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
