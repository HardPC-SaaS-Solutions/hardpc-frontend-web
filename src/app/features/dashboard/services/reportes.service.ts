import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

// ── IMPORTACIÓN MODULAR Y ESTRICTA DE TUS DTOs REALES ──────────────────
import {
  IngresoMensualDTO,
  VentasPorClienteDTO,
  TopProductoDTO,
  RendimientoCajeroDTO
} from '../../../core/models/venta.dto';

import {
  GastoMensualDTO,
  GastoProveedorDTO
} from '../../../core/models/reportes-compras.dto';

import { ResumenEstadoSerialDTO } from '../../../core/models/item-serial.dto';
import { InversionStockDTO } from '../../../core/models/stock-local.dto';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  // ======================================================================
  // --- SUB-MÓDULO ANALÍTICO: VENTAS, CAJA & CLIENTES ---
  // ======================================================================

  /**
   * @description Curva histórica de ingresos mensuales generados por ventas (Gráfico de Líneas/Barras).
   */
  obtenerReporteIngresoMensual(): Observable<IngresoMensualDTO[]> {
    return this.http.get<IngresoMensualDTO[]>(`${this.API_URL}/ventas/reportes/ingreso-mensual`);
  }

  /**
   * @description Concentrado acumulado de facturación cruzada por cliente (BI / Tablas Avanzadas).
   */
  obtenerReporteVentasPorCliente(): Observable<VentasPorClienteDTO[]> {
    return this.http.get<VentasPorClienteDTO[]>(`${this.API_URL}/ventas/reportes/ventas-cliente`);
  }

  /**
   * @description Top 10 de productos con mayor rotación y unidades descargadas (Gráfico de Barras).
   */
  obtenerTopProductos(): Observable<TopProductoDTO[]> {
    return this.http.get<TopProductoDTO[]>(`${this.API_URL}/ventas/reportes/top-productos`);
  }

  /**
   * @description Evaluación de productividad y montos consolidados por cajero operativo (Gráfico de Dona).
   */
  obtenerRendimientoCajeros(): Observable<RendimientoCajeroDTO[]> {
    return this.http.get<RendimientoCajeroDTO[]>(`${this.API_URL}/ventas/reportes/rendimiento-cajeros`);
  }

  // ======================================================================
  // --- SUB-MÓDULO ANALÍTICO: LOGÍSTICA & ALMACENES ---
  // ======================================================================

  /**
   * @description Capital financiero inmovilizado en mercadería calculado por cada local (KPI / Barras).
   */
  obtenerReporteInversion(): Observable<InversionStockDTO[]> {
    return this.http.get<InversionStockDTO[]>(`${this.API_URL}/stocks-locales/reporte-inversion`);
  }

  /**
   * @description Consolidado de la máquina de estados y disponibilidad del hardware serializado (Dona/Pie).
   */
  reporteEstadosAgrupados(): Observable<ResumenEstadoSerialDTO[]> {
    return this.http.get<ResumenEstadoSerialDTO[]>(`${this.API_URL}/items-seriales/reporte-estados`);
  }

  // ======================================================================
  // --- SUB-MÓDULO ANALÍTICO: PROVEEDORES & COMPRAS ---
  // ======================================================================

  /**
   * @description Curva histórica de egresos mensuales invertidos en abastecimiento (Líneas / Tendencias).
   */
  obtenerReporteGastoMensual(): Observable<GastoMensualDTO[]> {
    return this.http.get<GastoMensualDTO[]>(`${this.API_URL}/ingresos-compra/reportes/gasto-mensual`);
  }

  /**
   * @description Concentrado analítico de distribución de gastos por firma comercial / proveedor (BI).
   */
  obtenerReporteGastoPorProveedor(): Observable<GastoProveedorDTO[]> {
    return this.http.get<GastoProveedorDTO[]>(`${this.API_URL}/ingresos-compra/reportes/gasto-proveedor`);
  }
}
