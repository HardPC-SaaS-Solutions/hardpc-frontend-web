import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';
import { TipoComprobanteDTO } from '../../../core/models/tipo-comprobante.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

@Injectable({
  providedIn: 'root'
})
export class TipoComprobanteService {

  private http = inject(HttpClient);

  private readonly URL = `${environment.apiUrl}/tipos-comprobante`;

  listarPaginado(
    page: number,
    size: number,
    buscar: string = ''
  ): Observable<PageResponseDTO<TipoComprobanteDTO>> {

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<TipoComprobanteDTO>>(this.URL, { params });
  }

  listarParaCombo(): Observable<TipoComprobanteDTO[]> {
    return this.http.get<TipoComprobanteDTO[]>(`${this.URL}/combo`);
  }

  buscarPorId(id: number): Observable<TipoComprobanteDTO> {
    return this.http.get<TipoComprobanteDTO>(`${this.URL}/${id}`);
  }

  crear(dto: TipoComprobanteDTO): Observable<TipoComprobanteDTO> {
    return this.http.post<TipoComprobanteDTO>(this.URL, dto);
  }

  actualizar(id: number, dto: TipoComprobanteDTO): Observable<TipoComprobanteDTO> {
    return this.http.put<TipoComprobanteDTO>(`${this.URL}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}