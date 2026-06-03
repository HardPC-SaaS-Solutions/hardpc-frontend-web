import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { MarcaDTO } from '../../../core/models/marca.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio para la gestión de Marcas en el sistema de HardPC.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD y consultas.
 */
@Injectable({
  providedIn: 'root'
})
export class MarcaService {
  /** Inyección moderna del cliente HTTP. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de marcas de la API. */
  private readonly URL = `${environment.apiUrl}/marcas`;

  /**
   * @description Obtiene una lista paginada de marcas, soportando filtrado por texto.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<MarcaDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<MarcaDTO>>(`${this.URL}`, { params });
  }

  /**
   * @description Obtiene una lista ligera para poblar selectores desplegables (combobox).
   */
  listarParaCombo(): Observable<MarcaDTO[]> {
    return this.http.get<MarcaDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de una marca mediante su identificador.
   */
  buscarPorId(id: number): Observable<MarcaDTO> {
    return this.http.get<MarcaDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra una nueva marca en el sistema.
   */
  crear(marca: MarcaDTO): Observable<MarcaDTO> {
    return this.http.post<MarcaDTO>(this.URL, marca);
  }

  /**
   * @description Actualiza la información de una marca existente.
   */
  actualizar(id: number, marca: MarcaDTO): Observable<MarcaDTO> {
    return this.http.put<MarcaDTO>(`${this.URL}/${id}`, marca);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de una marca.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}