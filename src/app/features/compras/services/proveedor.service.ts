import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ProveedorDTO } from '../../../core/models/proveedor.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Proveedores en el sistema de HardPC.
 * Administra la comunicación HTTP para el registro y control de los socios comerciales
 * que abastecen el inventario de repuestos, equipos y suministros.
 */
@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de proveedores en la API. */
  private readonly URL = `${environment.apiUrl}/proveedores`;

  /**
   * @description Obtiene una lista paginada de proveedores, soportando búsquedas dinámicas.
   * Ideal para la tabla principal del módulo de compras y abastecimiento.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional (ej. RUC, razón social, nombre de contacto).
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<ProveedorDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<ProveedorDTO>>(this.URL, { params });
  }

  /**
   * @description Recupera los detalles completos de un proveedor específico mediante su identificador.
   * @param id Identificador único del proveedor.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<ProveedorDTO> {
    return this.http.get<ProveedorDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra un nuevo socio comercial/proveedor en el sistema.
   * @param dto Objeto DTO con los datos del nuevo proveedor.
   * @returns Observable con el registro recién creado.
   */
  crear(dto: ProveedorDTO): Observable<ProveedorDTO> {
    return this.http.post<ProveedorDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de un proveedor existente.
   * @param id Identificador único del proveedor a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el registro modificado.
   */
  actualizar(id: number, dto: ProveedorDTO): Observable<ProveedorDTO> {
    return this.http.put<ProveedorDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de un proveedor,
   * ocultándolo de las nuevas órdenes de compra sin afectar el historial de transacciones.
   * @param id Identificador único a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }

  /**
   * @description Reactiva un proveedor previamente desactivado.
   * ✨ Optimización Arquitectónica: Emplea una petición PATCH ligera con cuerpo nulo para
   * actualizar exclusivamente el estado lógico (booleano) en la base de datos.
   * @param id Identificador único del proveedor a reactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  reactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.URL}/${id}/reactivar`, null);
  }
}
