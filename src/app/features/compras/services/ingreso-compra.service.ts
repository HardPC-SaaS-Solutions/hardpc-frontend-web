import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { IngresoCompraRequestDTO } from '../../../core/models/ingreso-compra-request.dto';
import { IngresoCompraResponseDTO } from '../../../core/models/ingreso-compra-response.dto';
import { GastoMensualDTO, GastoProveedorDTO } from '../../../core/models/reportes-compras.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio centralizado para la gestión administrativa de compras e ingresos de almacén en HardPC.
 * Conecta los flujos de abastecimiento (transacciones Maestro-Detalle) y los reportes analíticos (BI)
 * con el backend de Spring Boot, garantizando la consistencia del Kardex y las finanzas.
 */
@Injectable({
  providedIn: 'root'
})
export class IngresoCompraService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de ingresos por compras en la API. */
  private readonly URL = `${environment.apiUrl}/ingresos-compra`;

  // =========================================================================================
  // --- OPERACIONES TRANSACCIONALES CORE ---
  // =========================================================================================

  /**
   * @description Registra un nuevo ingreso de mercadería bajo un patrón transaccional Maestro-Detalle.
   * ✨ Seguridad Arquitectónica: El backend extraerá automáticamente al operador logístico
   * desde el token JWT, garantizando una autoría inmutable en el Kardex.
   * @param dto Objeto con la cabecera del comprobante (factura/boleta) y el arreglo de productos/seriales.
   * @returns Observable con la confirmación estructurada del ingreso consolidado.
   */
  registrarCompra(dto: IngresoCompraRequestDTO): Observable<IngresoCompraResponseDTO> {
    return this.http.post<IngresoCompraResponseDTO>(this.URL, dto);
  }

  /**
   * @description Recupera la auditoría completa y el desglose de una compra específica.
   * @param id Identificador único interno del ingreso de compra.
   * @returns Observable con el DTO detallado de la transacción.
   */
  buscarPorId(id: number): Observable<IngresoCompraResponseDTO> {
    return this.http.get<IngresoCompraResponseDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Realiza una búsqueda paginada avanzada con flexibilidad de criterios cruzados.
   * Ideal para la tabla principal del módulo de abastecimiento.
   * @param page Índice de la página (0-based).
   * @param size Cantidad de registros por página.
   * @param fechaInicio Límite inferior cronológico (Formato ISO 8601, Ej: 2026-06-01T00:00:00).
   * @param fechaFin Límite superior cronológico (Formato ISO 8601, Ej: 2026-06-30T23:59:59).
   * @param idProveedor ID opcional del proveedor comercial a auditar.
   * @param idLocal ID opcional del local destino que recibió la mercadería.
   * @param estado Filtro opcional por la situación lógica de la transacción (Ej: 'REGISTRADO', 'ANULADO').
   * @param comprobante Filtro opcional de texto exacto o parcial para buscar por serie/número de boleta o factura.
   * @returns Observable con la respuesta paginada y filtrada.
   */
  listarPaginadoAvanzado(
    page: number,
    size: number,
    fechaInicio?: string | null,
    fechaFin?: string | null,
    idProveedor?: number | null,
    idLocal?: number | null,
    estado?: string | null,
    comprobante?: string | null
  ): Observable<PageResponseDTO<IngresoCompraResponseDTO>> {

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    if (idProveedor) params = params.set('idProveedor', idProveedor.toString());
    if (idLocal) params = params.set('idLocal', idLocal.toString());
    if (estado) params = params.set('estado', estado);
    if (comprobante && comprobante.trim() !== '') params = params.set('comprobante', comprobante.trim());

    return this.http.get<PageResponseDTO<IngresoCompraResponseDTO>>(this.URL, { params });
  }

  /**
   * @description Anula una transacción de compra previamente consolidada.
   * ✨ Optimización Transaccional: Ejecuta un pre-check de seguridad física en el servidor
   * (verifica que la mercadería siga disponible y no se haya vendido) y, de ser aprobado,
   * anula el documento y revierte el stock generando movimientos inmutables en el Kardex.
   * @param id Identificador del ingreso a anular.
   * @returns Observable con el estado final de la compra tras la anulación.
   */
  anularIngresoCompra(id: number): Observable<IngresoCompraResponseDTO> {
    return this.http.put<IngresoCompraResponseDTO>(`${this.URL}/${id}/anular`, null);
  }

  // =========================================================================================
  // --- ENDPOINTS ANALÍTICOS (BI / REPORTES) ---
  // =========================================================================================

  /**
   * @description Obtiene las métricas de gasto agrupadas de forma cronológica por año y mes.
   * Alimenta los gráficos estadísticos y está reservado para roles de gestión (ADMIN, SUPERVISOR).
   * @returns Observable con una matriz estructurada de gastos mensuales.
   */
  obtenerReporteGastoMensual(): Observable<GastoMensualDTO[]> {
    return this.http.get<GastoMensualDTO[]>(`${this.URL}/reportes/gasto-mensual`);
  }

  /**
   * @description Obtiene el ranking consolidado de inversión acumulada distribuido por cada proveedor.
   * Fundamental para negociaciones de volumen y auditorías financieras (ADMIN, SUPERVISOR).
   * @returns Observable con la matriz de distribución de capital por proveedor.
   */
  obtenerReporteGastoPorProveedor(): Observable<GastoProveedorDTO[]> {
    return this.http.get<GastoProveedorDTO[]>(`${this.URL}/reportes/gasto-proveedor`);
  }
}
