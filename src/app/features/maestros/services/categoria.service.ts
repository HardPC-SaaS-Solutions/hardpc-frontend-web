import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { CategoriaDTO } from '../../../core/models/categoria.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private http = inject(HttpClient);
  private readonly URL = `${environment.apiUrl}/categorias`;

  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<CategoriaDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<CategoriaDTO>>(`${this.URL}`, { params });
  }

  listarParaCombo(): Observable<CategoriaDTO[]> {
    return this.http.get<CategoriaDTO[]>(`${this.URL}/combo`);
  }

  buscarPorId(id: number): Observable<CategoriaDTO> {
    return this.http.get<CategoriaDTO>(`${this.URL}/${id}`);
  }

  crear(categoria: CategoriaDTO): Observable<CategoriaDTO> {
    return this.http.post<CategoriaDTO>(this.URL, categoria);
  }

  actualizar(id: number, categoria: CategoriaDTO): Observable<CategoriaDTO> {
    return this.http.put<CategoriaDTO>(`${this.URL}/${id}`, categoria);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}
