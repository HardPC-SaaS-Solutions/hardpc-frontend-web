import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { UnidadMedidaDTO } from '../../../core/models/unidad-medida.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Unidades de Medida en el sistema de HardPC.
 * Administra la comunicación HTTP para el catálogo de métricas estándar estipuladas
 * (ej. Unidades/NIU, Cajas, Metros) utilizadas en el control de inventario y facturación.
 */
@Injectable({
  providedIn: 'root'
})
export class UnidadMedidaService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de unidades de medida en la API. */
  private readonly URL = `${environment.apiUrl}/unidades-medida`;

  /**
   * @description Obtiene una lista paginada de unidades de medida, soportando filtrado por texto.
   * Ideal para la tabla principal de administración de configuraciones del catálogo.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados (nombre o símbolo).
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<UnidadMedidaDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<UnidadMedidaDTO>>(this.URL, { params });
  }

  /**
   * @description Obtiene una lista ligera y optimizada de unidades (usualmente solo registros activos)
   * para poblar selectores (combobox) al momento de registrar o editar un producto en el inventario.
   * @returns Observable con el arreglo de unidades disponibles.
   */
  listarParaCombo(): Observable<UnidadMedidaDTO[]> {
    return this.http.get<UnidadMedidaDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de una unidad de medida mediante su identificador.
   * @param id Identificador único de la unidad.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<UnidadMedidaDTO> {
    return this.http.get<UnidadMedidaDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra una nueva unidad de medida en el sistema.
   * @param dto Objeto DTO con los datos de la nueva unidad (nombre, símbolo, código SUNAT).
   * @returns Observable con el registro recién creado.
   */
  crear(dto: UnidadMedidaDTO): Observable<UnidadMedidaDTO> {
    return this.http.post<UnidadMedidaDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de una unidad de medida existente.
   * También se utiliza en la interfaz para ejecutar la restauración (reactivación) de registros.
   * @param id Identificador único de la unidad a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el registro modificado.
   */
  actualizar(id: number, dto: UnidadMedidaDTO): Observable<UnidadMedidaDTO> {
    return this.http.put<UnidadMedidaDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de una unidad de medida,
   * ocultándola de las nuevas operaciones de registro de productos.
   * @param id Identificador único a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
