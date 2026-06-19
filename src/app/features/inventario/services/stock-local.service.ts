import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { StockLocalDTO } from '../../../core/models/stock-local.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de inventario a granel (Stock Local) en HardPC.
 * Administra la comunicación HTTP para el control de existencias físicas distribuidas
 * en las distintas sucursales o locales, permitiendo consultas segmentadas, monitoreo
 * de reabastecimiento y reportes financieros.
 */
@Injectable({
  providedIn: 'root'
})
export class StockLocalService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de stocks por local en la API. */
  private readonly URL = `${environment.apiUrl}/stocks-locales`;

  // ======================================================================
  // --- LECTURAS Y BÚSQUEDAS ---
  // ======================================================================

  /**
   * @description Obtiene una lista paginada global de todos los registros de stock a nivel sistema.
   * Útil para vistas gerenciales que necesitan supervisar la totalidad del inventario.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number = 0, size: number = 10): Observable<PageResponseDTO<StockLocalDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponseDTO<StockLocalDTO>>(this.URL, { params });
  }

  /**
   * @description Recupera el detalle exacto de un registro de stock mediante su identificador único.
   * @param id Identificador único del registro de stock en un local específico.
   * @returns Observable con los datos del stock solicitado.
   */
  buscarPorId(id: number): Observable<StockLocalDTO> {
    return this.http.get<StockLocalDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Endpoint crítico para el Punto de Venta (POS) y Operarios de Almacén.
   * Busca y pagina el inventario físico disponible exclusivamente dentro de una sucursal/local específico.
   * @param idLocal Identificador de la sucursal a auditar o desde donde se está vendiendo.
   * @param page Índice de la página a consultar.
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda libre opcional (ej. nombre del producto o SKU).
   * @returns Observable con el stock filtrado y paginado correspondiente a ese local.
   */
  buscarEnLocalPaginado(idLocal: number, page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<StockLocalDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (buscar) {
      params = params.set('buscar', buscar);
    }
    return this.http.get<PageResponseDTO<StockLocalDTO>>(`${this.URL}/local/${idLocal}/buscar`, { params });
  }

  // ======================================================================
  // --- REPORTES FINANCIEROS Y ALERTAS OPERATIVAS ---
  // ======================================================================

  /**
   * @description Genera un reporte operativo de los productos cuyo nivel de existencias
   * ha caído por debajo del umbral mínimo de seguridad, detonando alertas de reabastecimiento.
   * @param page Índice de la página a consultar.
   * @param size Cantidad de registros por página.
   * @returns Observable con la lista paginada de productos en alerta.
   */
  listarAlertasStockMinimo(page: number = 0, size: number = 10): Observable<PageResponseDTO<StockLocalDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponseDTO<StockLocalDTO>>(`${this.URL}/alertas-stock`, { params });
  }

  /**
   * @description Genera un reporte financiero consolidado que calcula el capital total
   * inmovilizado en el inventario actual (Costo Unitario * Cantidad Disponible).
   * @returns Observable con el arreglo de datos del reporte de inversión.
   * TODO: Tipar fuertemente el retorno utilizando la interfaz `InversionStockDTO` cuando esté disponible.
   */
  obtenerReporteInversion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.URL}/reporte-inversion`);
  }

  // ======================================================================
  // --- ESCRITURA (Gestión Administrativa Excepcional) ---
  // ======================================================================
  // 🏗️ Nota Arquitectónica: Normalmente, los niveles de stock mutan a través
  // de transacciones comerciales (Entradas por Compras, Salidas por Ventas).
  // Estos métodos CRUD directos se reservan exclusivamente para ajustes manuales
  // de inventario (auditorías, conciliaciones, saldos iniciales o registro de mermas/robos).

  /**
   * @description Registra manualmente una nueva apertura de stock inicial para un producto en un local.
   * @param dto Objeto con los datos de inicialización del stock (idProducto, idLocal, cantidad base).
   * @returns Observable con el registro creado.
   */
  crear(dto: StockLocalDTO): Observable<StockLocalDTO> {
    return this.http.post<StockLocalDTO>(this.URL, dto);
  }

  /**
   * @description Modifica directamente los valores numéricos de un registro de stock.
   * Reservado para administradores durante procesos de arqueo e igualación de inventario físico vs sistema.
   * @param id Identificador único del registro de stock a corregir.
   * @param dto Objeto con la información actualizada.
   * @returns Observable con el registro rectificado.
   */
  actualizar(id: number, dto: StockLocalDTO): Observable<StockLocalDTO> {
    return this.http.put<StockLocalDTO>(`${this.URL}/${id}`, dto);
  }
}
