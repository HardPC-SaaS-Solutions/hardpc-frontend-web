import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { TipoDocumentoDTO } from '../../../core/models/tipo-documento.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Tipos de Documento de Identidad en HardPC.
 * Administra el catálogo de documentos formales (ej. DNI, RUC, CE) indispensables
 * para la facturación electrónica y el registro validado de clientes o proveedores.
 */
@Injectable({
  providedIn: 'root'
})
export class TipoDocumentoService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de tipos de documento en la API. */
  private readonly URL = `${environment.apiUrl}/tipos-documento`;

  /**
   * @description Obtiene una lista paginada de tipos de documento, soportando filtrado por texto.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados (descripción o abreviatura).
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<TipoDocumentoDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<TipoDocumentoDTO>>(this.URL, { params });
  }

  /**
   * @description Obtiene una lista optimizada de documentos activos para poblar selectores
   * en los módulos de ventas, compras o gestión de usuarios.
   * @returns Observable con el arreglo de tipos de documento disponibles.
   */
  listarParaCombo(): Observable<TipoDocumentoDTO[]> {
    return this.http.get<TipoDocumentoDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles de un tipo de documento mediante su identificador único.
   * @param id Identificador del documento.
   * @returns Observable con los datos del registro.
   */
  buscarPorId(id: number): Observable<TipoDocumentoDTO> {
    return this.http.get<TipoDocumentoDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Busca un tipo de documento específico basándose en su abreviatura oficial (ej. 'DNI', 'RUC').
   * Ideal para aplicar validaciones de longitud y formato en tiempo real desde el frontend.
   * @param abreviatura Cadena de texto con la abreviatura del documento.
   * @returns Observable con los datos del documento coincidente.
   */
  buscarPorAbreviatura(abreviatura: string): Observable<TipoDocumentoDTO> {
    return this.http.get<TipoDocumentoDTO>(`${this.URL}/abreviatura/${abreviatura}`);
  }

  /**
   * @description Registra un nuevo tipo de documento en el sistema.
   * @param dto Objeto DTO con los datos del documento.
   * @returns Observable con el registro recién creado.
   */
  crear(dto: TipoDocumentoDTO): Observable<TipoDocumentoDTO> {
    return this.http.post<TipoDocumentoDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza la información de un tipo de documento existente.
   * También se utiliza desde la UI para ejecutar la restauración (reactivación) de registros.
   * @param id Identificador único del documento a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el registro modificado.
   */
  actualizar(id: number, dto: TipoDocumentoDTO): Observable<TipoDocumentoDTO> {
    return this.http.put<TipoDocumentoDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de un tipo de documento en el sistema.
   * @param id Identificador único a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
