import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { CategoriaDTO } from '../../../core/models/categoria.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Categorías en el sistema de HardPC.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD y
 * consultas optimizadas del catálogo de productos (ej. repuestos para laptops, equipos).
 */
@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  /** Inyección moderna del cliente HTTP. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de categorías de la API. */
  private readonly URL = `${environment.apiUrl}/categorias`;

  /**
   * @description Obtiene una lista paginada de categorías, soportando filtrado por texto.
   * Ideal para tablas de datos que manejan grandes volúmenes de información.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados (nombre o descripción).
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<CategoriaDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<CategoriaDTO>>(`${this.URL}`, { params });
  }

  /**
   * @description Obtiene una lista ligera y optimizada de categorías (usualmente solo activas)
   * para poblar selectores desplegables (combobox) en otras interfaces, como la creación de productos.
   * @returns Observable con el arreglo de categorías básicas.
   */
  listarParaCombo(): Observable<CategoriaDTO[]> {
    return this.http.get<CategoriaDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de una categoría mediante su identificador.
   * @param id Identificador único de la categoría.
   * @returns Observable con los datos de la categoría solicitada.
   */
  buscarPorId(id: number): Observable<CategoriaDTO> {
    return this.http.get<CategoriaDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra una nueva categoría en el catálogo del sistema.
   * @param categoria Objeto DTO con los datos de la nueva categoría.
   * @returns Observable con la categoría recién creada (incluyendo el ID asignado por el backend).
   */
  crear(categoria: CategoriaDTO): Observable<CategoriaDTO> {
    return this.http.post<CategoriaDTO>(this.URL, categoria);
  }

  /**
   * @description Actualiza integralmente la información de una categoría existente.
   * También se utiliza en el frontend para ejecutar la restauración (reactivación) de registros.
   * @param id Identificador único de la categoría a modificar.
   * @param categoria Objeto DTO con los datos actualizados.
   * @returns Observable con la categoría modificada.
   */
  actualizar(id: number, categoria: CategoriaDTO): Observable<CategoriaDTO> {
    return this.http.put<CategoriaDTO>(`${this.URL}/${id}`, categoria);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de una categoría en el sistema.
   * @param id Identificador único de la categoría a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
