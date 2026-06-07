import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { UsuarioDTO } from '../../../core/models/usuario.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Usuarios en el sistema de HardPC.
 * Administra la comunicación HTTP para el control de cuentas, asignación de roles
 * y gestión de perfiles del personal que opera el ERP.
 */
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de usuarios en la API. */
  private readonly URL = `${environment.apiUrl}/usuarios`;

  /**
   * @description Obtiene una lista paginada de usuarios, soportando filtrado por texto.
   * Ideal para la tabla principal de administración del personal.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados (nombre, correo o username).
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<UsuarioDTO>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<UsuarioDTO>>(this.URL, { params });
  }

  /**
   * @description Recupera los detalles completos de un usuario específico mediante su identificador.
   * @param id Identificador único del usuario.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<UsuarioDTO> {
    return this.http.get<UsuarioDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Registra un nuevo usuario en el sistema.
   * @param dto Objeto DTO con los datos del nuevo usuario (credenciales, rol y local asignado).
   * @returns Observable con el registro recién creado.
   */
  crear(dto: UsuarioDTO): Observable<UsuarioDTO> {
    return this.http.post<UsuarioDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de un usuario existente.
   * @param id Identificador único del usuario a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el registro modificado.
   */
  actualizar(id: number, dto: UsuarioDTO): Observable<UsuarioDTO> {
    return this.http.put<UsuarioDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de un usuario,
   * revocando inmediatamente su acceso al sistema de facturación e inventario.
   * @param id Identificador único a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }

  /**
   * @description Reactiva un usuario previamente desactivado.
   * ✨ Optimización Arquitectónica: Utiliza PATCH para modificar unívocamente el estado
   * del registro, evitando la sobrecarga de red de enviar un payload PUT completo
   * solo para alterar un valor booleano.
   * @param id Identificador único del usuario a reactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  reactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.URL}/${id}/reactivar`, null);
  }
}
