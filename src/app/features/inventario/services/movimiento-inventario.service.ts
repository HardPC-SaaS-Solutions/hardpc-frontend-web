import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { MovimientoInventarioDTO, TipoMovimiento } from '../../../core/models/movimiento-inventario.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión del Kardex y Movimientos de Inventario en HardPC.
 * Administra la trazabilidad de entradas, salidas y traslados de mercancía.
 * ✨ Diseño Arquitectónico: Implementa el patrón de "Escritura Inmutable" (Append-Only),
 * garantizando que el historial contable y logístico jamás sea alterado o borrado.
 */
@Injectable({
  providedIn: 'root'
})
export class MovimientoInventarioService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de movimientos de inventario en la API. */
  private readonly URL = `${environment.apiUrl}/movimientos-inventario`;

  // ======================================================================
  // --- HISTÓRICOS Y AUDITORÍA ---
  // ======================================================================

  /**
   * @description Obtiene el registro global y paginado de todos los movimientos del sistema.
   * Ideal para la vista general de auditoría o el historial principal del Kardex.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @returns Observable con el historial paginado desde el servidor.
   */
  listarTodos(page: number = 0, size: number = 20): Observable<PageResponseDTO<MovimientoInventarioDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponseDTO<MovimientoInventarioDTO>>(this.URL, { params });
  }

  /**
   * @description Recupera el detalle completo y exacto de una transacción de inventario específica.
   * @param id Identificador único del movimiento.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<MovimientoInventarioDTO> {
    return this.http.get<MovimientoInventarioDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Consulta el historial de movimientos (Kardex específico) de un único producto.
   * Vital para rastrear el ciclo de vida, compras y ventas de un SKU en particular.
   * @param idProducto Identificador del producto a auditar.
   * @param page Índice de la página a consultar.
   * @param size Cantidad de registros por página.
   * @returns Observable con los movimientos paginados correspondientes al producto.
   */
  listarPorProducto(idProducto: number, page: number = 0, size: number = 20): Observable<PageResponseDTO<MovimientoInventarioDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponseDTO<MovimientoInventarioDTO>>(`${this.URL}/producto/${idProducto}`, { params });
  }

  /**
   * @description Consulta el historial de actividad logística de una sucursal específica.
   * Permite a los administradores de tienda visualizar todas las entradas y salidas de su local.
   * @param idLocal Identificador de la sucursal o almacén.
   * @param page Índice de la página a consultar.
   * @param size Cantidad de registros por página.
   * @returns Observable con los movimientos paginados correspondientes al local.
   */
  listarPorLocal(idLocal: number, page: number = 0, size: number = 20): Observable<PageResponseDTO<MovimientoInventarioDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponseDTO<MovimientoInventarioDTO>>(`${this.URL}/local/${idLocal}`, { params });
  }

  /**
   * @description Genera reportes avanzados del Kardex mediante filtros cruzados.
   * Útil para conciliaciones a fin de mes o auditorías de fechas específicas.
   * @param page Índice de la página a consultar.
   * @param size Cantidad de registros por página.
   * @param fechaInicio Fecha inicial del rango de auditoría (formato ISO/YYYY-MM-DD).
   * @param fechaFin Fecha final del rango de auditoría (formato ISO/YYYY-MM-DD).
   * @param tipo Filtro opcional por la naturaleza del movimiento (ENTRADA, SALIDA, TRASLADO, etc.).
   * @returns Observable con los resultados paginados y filtrados.
   */
  filtrarHistorial(page: number, size: number, fechaInicio?: string, fechaFin?: string, tipo?: TipoMovimiento): Observable<PageResponseDTO<MovimientoInventarioDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    if (tipo) params = params.set('tipo', tipo);

    return this.http.get<PageResponseDTO<MovimientoInventarioDTO>>(`${this.URL}/auditoria`, { params });
  }

  // ======================================================================
  // --- ESCRITURA INMUTABLE (KARDEX) ---
  // ======================================================================

  /**
   * @description Asienta de forma permanente un nuevo movimiento en el Kardex.
   * Afecta automáticamente el stock disponible en el sistema. Al ser inmutable, no existen métodos PUT ni DELETE.
   * @param dto Objeto con los datos del movimiento (cantidad, producto, local, tipo, motivo).
   * @returns Observable con la confirmación de la transacción asentada.
   */
  registrarMovimiento(dto: MovimientoInventarioDTO): Observable<MovimientoInventarioDTO> {
    return this.http.post<MovimientoInventarioDTO>(this.URL, dto);
  }

  /**
   * @description Orquesta una transacción compleja que representa un traslado de mercancía.
   * Internamente, el backend debería traducirlo en una SALIDA del local origen y una ENTRADA al local destino
   * bajo el amparo de la misma transacción de base de datos (ACID).
   * @param dto Objeto con los datos del traslado.
   * @returns Observable con la confirmación de la operación.
   */
  registrarTraslado(dto: MovimientoInventarioDTO): Observable<MovimientoInventarioDTO> {
    return this.http.post<MovimientoInventarioDTO>(`${this.URL}/traslado`, dto);
  }
}
