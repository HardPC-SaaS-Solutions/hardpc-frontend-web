import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { VentaRequestDTO, VentaResponseDTO, IngresoMensualDTO, VentasPorClienteDTO } from '../../../core/models/venta.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio core para la administración del Punto de Venta (POS) e históricos de facturación.
 * Conecta las operaciones transaccionales de caja y las consultas analíticas gerenciales con Spring Boot.
 */
@Injectable({
  providedIn: 'root'
})
export class VentaService {
  private http = inject(HttpClient);
  private readonly URL = `${environment.apiUrl}/ventas`;

  // ======================================================================
  // --- TRANSACCIONES ---
  // ======================================================================

  /**
   * @description Registra una nueva venta junto con su detalle de productos.
   */
  registrarVenta(dto: VentaRequestDTO): Observable<VentaResponseDTO> {
    return this.http.post<VentaResponseDTO>(this.URL, dto);
  }

  /**
   * @description Obtiene la información completa de una venta por su identificador.
   */
  buscarPorId(id: number): Observable<VentaResponseDTO> {
    return this.http.get<VentaResponseDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Realiza una búsqueda paginada avanzada con flexibilidad de criterios cruzados.
   * Homologado con el módulo de compras para filtrar por estado y número de comprobante.
   */
  listarPaginadoAvanzado(
    page: number,
    size: number,
    fechaInicio?: string | null,
    fechaFin?: string | null,
    idCliente?: number | null,
    idLocal?: number | null,
    estado?: string | null,
    comprobante?: string | null
  ): Observable<PageResponseDTO<VentaResponseDTO>> {

    // Parámetros base para la paginación.
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    // Agrega únicamente los filtros informados por el usuario.
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    if (idCliente) params = params.set('idCliente', idCliente.toString());
    if (idLocal) params = params.set('idLocal', idLocal.toString());

    // Filtros adicionales para mantener consistencia con Compras.
    if (estado) params = params.set('estado', estado);
    if (comprobante && comprobante.trim() !== '') {
      params = params.set('comprobante', comprobante.trim());
    }

    return this.http.get<PageResponseDTO<VentaResponseDTO>>(this.URL, { params });
  }

  /**
   * @description Anula una venta previamente registrada.
   */
  anularVenta(id: number): Observable<VentaResponseDTO> {
    return this.http.put<VentaResponseDTO>(`${this.URL}/${id}/anular`, null);
  }

  // ======================================================================
  // --- INTELIGENCIA DE NEGOCIO (BI) ---
  // ======================================================================

  /**
   * @description Obtiene el reporte consolidado de ingresos mensuales.
   */
  obtenerReporteIngresoMensual(): Observable<IngresoMensualDTO[]> {
    return this.http.get<IngresoMensualDTO[]>(`${this.URL}/reportes/ingreso-mensual`);
  }

  /**
   * @description Obtiene el reporte consolidado de ventas agrupadas por cliente.
   */
  obtenerReporteVentasPorCliente(): Observable<VentasPorClienteDTO[]> {
    return this.http.get<VentasPorClienteDTO[]>(`${this.URL}/reportes/ventas-cliente`);
  }
}
