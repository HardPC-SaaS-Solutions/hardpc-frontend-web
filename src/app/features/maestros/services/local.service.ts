import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';
import { LocalDTO } from '../../../core/models/local.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

@Injectable({
  providedIn: 'root'
})
export class LocalService {

  private http = inject(HttpClient);

  private readonly URL = `${environment.apiUrl}/locales`;

  listarPaginado(
    page: number,
    size: number,
    buscar: string = ''
  ): Observable<PageResponseDTO<LocalDTO>> {

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<LocalDTO>>(this.URL, { params });
  }

  listarParaCombo(): Observable<LocalDTO[]> {
    return this.http.get<LocalDTO[]>(`${this.URL}/combo`);
  }

  buscarPorId(id: number): Observable<LocalDTO> {
    return this.http.get<LocalDTO>(`${this.URL}/${id}`);
  }

  crear(dto: LocalDTO): Observable<LocalDTO> {
    return this.http.post<LocalDTO>(this.URL, dto);
  }

  actualizar(id: number, dto: LocalDTO): Observable<LocalDTO> {
    return this.http.put<LocalDTO>(`${this.URL}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}