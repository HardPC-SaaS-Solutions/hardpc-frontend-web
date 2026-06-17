import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ProductoDTO } from '../../../core/models/producto.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión del catálogo de Productos.
 * Administra la comunicación HTTP para el control de inventario de Anta Salón Spa y Barbería,
 * abarcando tanto los artículos para venta al público como los suministros de uso interno.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de productos en la API. */
  private readonly URL = `${environment.apiUrl}/productos`;

  /**
   * @description Obtiene una lista paginada de productos implementando un motor de
   * filtros dinámicos cruzados. Ideal para vistas complejas de administración de stock.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda libre opcional (ej. nombre del producto o código).
   * @param esSerializado Filtro booleano para discriminar productos con seguimiento por número de serie.
   * @param idCategoria ID opcional para filtrar por la clasificación del producto.
   * @param idMarca ID opcional para filtrar por firma comercial.
   * @param idUnidadMedida ID opcional para filtrar por métrica (ej. Litros, Unidades).
   * @returns Observable con la respuesta paginada y filtrada desde el servidor.
   */
  listarPaginado(
    page: number,
    size: number,
    buscar: string = '',
    esSerializado?: boolean | null,
    idCategoria?: number | null,
    idMarca?: number | null,
    idUnidadMedida?: number | null
  ): Observable<PageResponseDTO<ProductoDTO>> {

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) params = params.set('buscar', buscar);

    if (esSerializado !== undefined && esSerializado !== null) {
      params = params.set('esSerializado', esSerializado.toString());
    }
    if (idCategoria) {
      params = params.set('idCategoria', idCategoria.toString());
    }
    if (idMarca) {
      params = params.set('idMarca', idMarca.toString());
    }
    if (idUnidadMedida) {
      params = params.set('idUnidadMedida', idUnidadMedida.toString());
    }

    return this.http.get<PageResponseDTO<ProductoDTO>>(this.URL, { params });
  }

  // ======================================================================
  // --- ENDPOINTS OPTIMIZADOS PARA EL FUTURO PUNTO DE VENTA (POS) ---
  // ======================================================================

  /**
   * @description Recupera un listado de productos activos pertenecientes a una categoría específica.
   * Diseñado para poblar interfaces táctiles o catálogos rápidos en el módulo de Ventas.
   * @param idCategoria Identificador de la categoría a consultar.
   * @param page Índice de paginación (por defecto 0).
   * @param size Tamaño del bloque de resultados (por defecto 20).
   * @returns Observable con la respuesta paginada, ordenada alfabéticamente por descripción.
   */
  listarActivosPorCategoria(idCategoria: number, page: number = 0, size: number = 20): Observable<PageResponseDTO<ProductoDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sort', 'descripcion');
    return this.http.get<PageResponseDTO<ProductoDTO>>(`${this.URL}/categoria/${idCategoria}`, { params });
  }

  /**
   * @description Recupera un listado de productos activos filtrados por su marca comercial.
   * Ideal para estrategias de venta cruzada o filtros rápidos en el POS del salón.
   * @param idMarca Identificador de la marca a consultar.
   * @param page Índice de paginación (por defecto 0).
   * @param size Tamaño del bloque de resultados (por defecto 20).
   * @returns Observable con la respuesta paginada, ordenada alfabéticamente por descripción.
   */
  listarActivosPorMarca(idMarca: number, page: number = 0, size: number = 20): Observable<PageResponseDTO<ProductoDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sort', 'descripcion');
    return this.http.get<PageResponseDTO<ProductoDTO>>(`${this.URL}/marca/${idMarca}`, { params });
  }

  // ======================================================================
  // --- MÉTODOS CRUD ESTÁNDAR ---
  // ======================================================================

  /**
   * @description Recupera los detalles completos y relaciones de un producto mediante su ID.
   * @param id Identificador único del producto.
   * @returns Observable con los datos estructurados del DTO.
   */
  buscarPorId(id: number): Observable<ProductoDTO> {
    return this.http.get<ProductoDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Ingresa un nuevo producto al catálogo general del sistema.
   * @param dto Objeto con la información del producto (precios, stock, categorías, etc.).
   * @returns Observable con el registro persistido en la base de datos.
   */
  crear(dto: ProductoDTO): Observable<ProductoDTO> {
    return this.http.post<ProductoDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente las propiedades de un producto existente.
   * @param id Identificador del producto a modificar.
   * @param dto Objeto con la nueva información.
   * @returns Observable con el registro actualizado.
   */
  actualizar(id: number, dto: ProductoDTO): Observable<ProductoDTO> {
    return this.http.put<ProductoDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Desactiva lógicamente un producto, retirándolo de las vistas de venta
   * y compras, sin comprometer la integridad de comprobantes históricos.
   * @param id Identificador del producto a suspender.
   * @returns Observable vacío que indica la culminación del proceso.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }

  /**
   * @description Reactiva un producto previamente descontinuado.
   * ✨ Optimización Arquitectónica: Ejecuta una actualización parcial (PATCH) con payload nulo
   * para conmutar únicamente la bandera de estado en el backend.
   * @param id Identificador del producto a restaurar.
   * @returns Observable vacío que indica la culminación del proceso.
   */
  reactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.URL}/${id}/reactivar`, null);
  }
}
