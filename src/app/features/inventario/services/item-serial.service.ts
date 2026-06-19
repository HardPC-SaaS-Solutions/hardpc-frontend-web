import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ItemSerialDTO, EstadoDisponibilidad } from '../../../core/models/item-serial.dto';
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
  // --- LECTURAS Y BÚSQUEDAS ---
  // ======================================================================

  /**
   * @description Obtiene una lista paginada del inventario serializado, ordenada por defecto
   * por su número de serie. Soporta filtrado cruzado por término de búsqueda y por sucursal.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término opcional para búsqueda libre (ej. número de serie, SKU o descripción).
   * @param idLocal Identificador opcional para restringir la vista a una sucursal específica.
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = '', idLocal?: number): Observable<PageResponseDTO<ItemSerialDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sort', 'numeroSerie');
    if (buscar) {
      params = params.set('buscar', buscar);
    }
    if (idLocal) {
      params = params.set('idLocal', idLocal.toString());
    }
    return this.http.get<PageResponseDTO<ItemSerialDTO>>(this.URL, { params });
  }

  /**
   * @description Recupera los metadatos completos de un ítem serializado mediante su ID interno.
   * @param id Identificador único de base de datos del ítem.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<ItemSerialDTO> {
    return this.http.get<ItemSerialDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Búsqueda de alta precisión por coincidencia exacta del código de serie.
   * ✨ Optimización Operativa: Este endpoint es el núcleo para la integración con hardware externo
   * (Pistolas lectoras de Códigos de Barras / QR) en el módulo del Punto de Venta (POS) o Almacén.
   * @param numeroSerie Cadena de texto exacta impresa en la etiqueta del producto.
   * @returns Observable con los datos del ítem encontrado.
   */
  buscarPorSerialExacto(numeroSerie: string): Observable<ItemSerialDTO> {
    return this.http.get<ItemSerialDTO>(`${this.URL}/serial/${numeroSerie}`);
  }

  /**
   * @description Endpoint crítico para el Punto de Venta (POS). Recupera exclusivamente
   * aquellos ítems que se encuentran en estado 'DISPONIBLE' dentro de un local específico,
   * ordenados por su antigüedad de ingreso (FIFO) para garantizar una rotación de stock saludable.
   * @param idLocal Identificador de la sucursal desde donde se realiza la consulta/venta.
   * @param page Índice de la página a consultar.
   * @param size Cantidad de registros por página.
   * @returns Observable con el stock serializado listo para ser vendido.
   */
  listarDisponiblesPorLocal(idLocal: number, page: number = 0, size: number = 10): Observable<PageResponseDTO<ItemSerialDTO>> {
    // Nota arquitectónica: Asegurar que 'fechaCreacion' esté indexada en la base de datos de Spring Boot para optimizar el sort
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString()).set('sort', 'fechaCreacion');
    return this.http.get<PageResponseDTO<ItemSerialDTO>>(`${this.URL}/local/${idLocal}/disponibles`, { params });
  }

  // ======================================================================
  // --- REPORTES Y ANALÍTICAS ---
  // ======================================================================

  /**
   * @description Genera un resumen estadístico agrupando el volumen de ítems según su estado
   * actual en el ciclo de vida (ej. X Disponibles, Y Vendidos, Z En Garantía/Mantenimiento).
   * Ideal para renderizar gráficos de torta o tarjetas de KPI en los Dashboards gerenciales.
   * @returns Observable con el arreglo de datos agregados.
   * TODO: Tipar fuertemente utilizando `ResumenEstadoSerialDTO` en lugar de `any[]`.
   */
  reporteEstadosAgrupados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.URL}/reporte-estados`);
  }

  // ======================================================================
  // --- ESCRITURA Y MÁQUINA DE ESTADOS ---
  // ======================================================================

  /**
   * @description Registra de forma individual un nuevo ítem serializado al sistema, asociándolo
   * a un producto del catálogo y a una ubicación física inicial.
   * @param dto Objeto DTO con los datos de ingreso (número de serie, idProducto, idLocal).
   * @returns Observable con el registro persistido.
   */
  crear(dto: ItemSerialDTO): Observable<ItemSerialDTO> {
    return this.http.post<ItemSerialDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza los datos o corrige errores de digitación en un registro serializado.
   * @param id Identificador único del ítem a modificar.
   * @param dto Objeto con la información actualizada.
   * @returns Observable con el registro rectificado.
   */
  actualizar(id: number, dto: ItemSerialDTO): Observable<ItemSerialDTO> {
    return this.http.put<ItemSerialDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Transiciona un ítem serializado a una nueva fase dentro de su ciclo de vida.
   * ✨ Optimización Arquitectónica: Emplea PATCH pasando el nuevo estado como Query Parameter,
   * evitando enviar un payload completo para mutar la lógica de la máquina de estados.
   * Utilizado automáticamente tras concretar una venta (DISPONIBLE -> VENDIDO) o devolución.
   * @param id Identificador único del ítem serial.
   * @param nuevoEstado Valor del enum representativo de la nueva condición (ej. 'VENDIDO', 'EN_MANTENIMIENTO').
   * @returns Observable vacío que confirma la transición exitosa.
   */
  cambiarEstado(id: number, nuevoEstado: EstadoDisponibilidad): Observable<void> {
    const params = new HttpParams().set('nuevoEstado', nuevoEstado);
    return this.http.patch<void>(`${this.URL}/${id}/estado`, null, { params });
  }
}
