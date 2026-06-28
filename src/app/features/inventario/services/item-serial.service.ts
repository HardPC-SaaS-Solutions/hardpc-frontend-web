import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ItemSerialDTO, EstadoDisponibilidad, ResumenEstadoSerialDTO } from '../../../core/models/item-serial.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Inventario Serializado (Items Únicos) en HardPC.
 * Administra el ciclo de vida, trazabilidad y ubicación de productos de alto valor o con garantía
 * individual (donde cada unidad tiene un número de serie irrepetible, como laptops o hardware específico).
 */
@Injectable({
  providedIn: 'root'
})
export class ItemSerialService {

  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de ítems serializados en la API. */
  private readonly URL = `${environment.apiUrl}/items-seriales`;

  // ======================================================================
  // --- LECTURAS Y BÚSQUEDAS (KARDEX Y ALMACÉN) ---
  // ======================================================================

  /**
   * @description Obtiene una página de ítems serializados con filtrado opcional por texto y local de almacenamiento.
   */
  listarPaginado(page: number, size: number, buscar: string = '', idLocal?: number): Observable<PageResponseDTO<ItemSerialDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sort', 'numeroSerie');
    if (buscar) params = params.set('buscar', buscar);
    if (idLocal) params = params.set('idLocal', idLocal.toString());

    return this.http.get<PageResponseDTO<ItemSerialDTO>>(this.URL, { params });
  }

  /**
   * @description Recupera el detalle completo de un ítem serializado por su identificador único.
   */
  buscarPorId(id: number): Observable<ItemSerialDTO> {
    return this.http.get<ItemSerialDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Localiza un ítem serializado a partir de su número de serie exacto,
   * útil para trazabilidad y verificación física en almacén.
   */
  buscarPorSerialExacto(numeroSerie: string): Observable<ItemSerialDTO> {
    return this.http.get<ItemSerialDTO>(`${this.URL}/serial/${numeroSerie}`);
  }

  /**
   * @description Obtiene de forma paginada los ítems en estado disponible pertenecientes a un local específico.
   */
  listarDisponiblesPorLocal(idLocal: number, page: number = 0, size: number = 10): Observable<PageResponseDTO<ItemSerialDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sort', 'fechaCreacion');
    return this.http.get<PageResponseDTO<ItemSerialDTO>>(`${this.URL}/local/${idLocal}/disponibles`, { params });
  }

  // ======================================================================
  // --- 🔥 MÉTODOS CRÍTICOS PARA EL PUNTO DE VENTA (POS) ---
  // ======================================================================

  /**
   * @description Endpoint ultraligero exclusivo para el modal de asignación de Hardware en Ventas.
   * A diferencia del listarDisponiblesPorLocal, este busca de un PRODUCTO ESPECÍFICO y retorna solo Strings
   * para prevenir el desborde de memoria RAM en la terminal de caja.
   */
  obtenerSeriesDisponiblesParaVenta(idProducto: number, idLocal: number): Observable<string[]> {
    const params = new HttpParams()
      .set('idProducto', idProducto.toString())
      .set('idLocal', idLocal.toString());

    // Nota Backend: Asegúrate de que el RequestMapping en tu Controller apunte a esto
    return this.http.get<string[]>(`${this.URL}/disponibles`, { params });
  }

  // ======================================================================
  // --- REPORTES Y ANALÍTICAS ---
  // ======================================================================

  /**
   * @description Genera un resumen estadístico agrupando el volumen de ítems según su estado.
   * ✨ TODO RESUELTO: Ahora está tipado estrictamente con ResumenEstadoSerialDTO.
   */
  reporteEstadosAgrupados(): Observable<ResumenEstadoSerialDTO[]> {
    return this.http.get<ResumenEstadoSerialDTO[]>(`${this.URL}/reporte-estados`);
  }

  // ======================================================================
  // --- ESCRITURA Y MÁQUINA DE ESTADOS ---
  // ======================================================================

  /**
   * @description Registra un nuevo ítem serializado en el inventario del sistema.
   */
  crear(dto: ItemSerialDTO): Observable<ItemSerialDTO> {
    return this.http.post<ItemSerialDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza los datos de un ítem serializado existente identificado por su id.
   */
  actualizar(id: number, dto: ItemSerialDTO): Observable<ItemSerialDTO> {
    return this.http.put<ItemSerialDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta una transición de estado sobre un ítem serializado
   * siguiendo las reglas de la máquina de estados del inventario (disponible, vendido, en reparación, etc.).
   */
  cambiarEstado(id: number, nuevoEstado: EstadoDisponibilidad): Observable<void> {
    const params = new HttpParams().set('nuevoEstado', nuevoEstado);
    return this.http.patch<void>(`${this.URL}/${id}/estado`, null, { params });
  }
}
