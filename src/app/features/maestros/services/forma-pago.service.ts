import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { FormaPagoDTO } from '../../../core/models/forma-pago.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio para la gestión de Formas de Pago en el sistema de HardPC.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD y consultas.
 */
@Injectable({
  providedIn: 'root'
})
export class FormaPagoService {
  /** Inyección moderna del cliente HTTP. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de formas de pago de la API. */
  private readonly URL = `${environment.apiUrl}/formas-pago`;

  /**
   * @description Obtiene una lista paginada de formas de pago, soportando filtrado por texto.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<FormaPagoDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<FormaPagoDTO>>(`${this.URL}`, { params });
  }

  /**
   * @description Obtiene una lista ligera para poblar selectores desplegables (combobox).
   */
  listarParaCombo(): Observable<FormaPagoDTO[]> {
    return this.http.get<FormaPagoDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles de una forma de pago mediante su identificador.
   */
  buscarPorId(id: number): Observable<FormaPagoDTO> {
    return this.http.get<FormaPagoDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra una nueva forma de pago en el sistema.
   */
  crear(formaPago: FormaPagoDTO): Observable<FormaPagoDTO> {
    return this.http.post<FormaPagoDTO>(this.URL, formaPago);
  }

  /**
   * @description Actualiza la información de una forma de pago existente.
   */
  actualizar(id: number, formaPago: FormaPagoDTO): Observable<FormaPagoDTO> {
    return this.http.put<FormaPagoDTO>(`${this.URL}/${id}`, formaPago);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de una forma de pago.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}