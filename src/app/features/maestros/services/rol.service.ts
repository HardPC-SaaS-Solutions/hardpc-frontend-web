import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { RolDTO } from '../../../core/models/rol.dto';
import { PageResponseDTO } from '../../../core/models/page-response.dto';

/**
 * @description Servicio central para la gestión de Roles y permisos del sistema HardPC.
 * Maneja la comunicación HTTP con la API para realizar operaciones CRUD y
 * gestionar los niveles de acceso del personal (ej. ADMIN, CAJERO, OPERATIVO).
 */
@Injectable({
  providedIn: 'root'
})
export class RolService {
  /** Inyección moderna del cliente HTTP de Angular. */
  private http = inject(HttpClient);

  /** Endpoint base para el recurso de roles en la API. */
  private readonly URL = `${environment.apiUrl}/roles`;

  /**
   * @description Obtiene una lista paginada de roles, soportando filtrado por texto.
   * Ideal para la tabla principal de administración de seguridad.
   * @param page Índice de la página a consultar (inicia en 0).
   * @param size Cantidad de registros por página.
   * @param buscar Término de búsqueda opcional para filtrar los resultados.
   * @returns Observable con la respuesta paginada desde el servidor.
   */
  listarPaginado(page: number, size: number, buscar: string = ''): Observable<PageResponseDTO<RolDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (buscar) {
      params = params.set('buscar', buscar);
    }

    return this.http.get<PageResponseDTO<RolDTO>>(this.URL, { params });
  }

  /**
   * @description Obtiene una lista ligera y optimizada de roles activos
   * para poblar selectores (combobox) durante la creación o edición de usuarios del sistema.
   * @returns Observable con el arreglo de roles disponibles.
   */
  listarParaCombo(): Observable<RolDTO[]> {
    return this.http.get<RolDTO[]>(`${this.URL}/combo`);
  }

  /**
   * @description Recupera los detalles específicos de un rol mediante su identificador interno.
   * @param id Identificador único del rol.
   * @returns Observable con los datos del registro solicitado.
   */
  buscarPorId(id: number): Observable<RolDTO> {
    return this.http.get<RolDTO>(`${this.URL}/${id}`);
  }

  /**
   * @description Recupera un rol específico basándose en el nombre estricto de su Enum
   * definido en el backend (ej. 'ROLE_ADMIN', 'ROLE_CAJERO').
   * @param nombre Cadena de texto con el nombre del rol.
   * @returns Observable con los datos del rol coincidente.
   */
  buscarPorNombre(nombre: string): Observable<RolDTO> {
    return this.http.get<RolDTO>(`${this.URL}/nombre/${nombre}`);
  }

  /**
   * @description Registra un nuevo nivel de acceso/rol en el sistema.
   * @param dto Objeto DTO con los datos del nuevo rol.
   * @returns Observable con el registro recién creado.
   */
  crear(dto: RolDTO): Observable<RolDTO> {
    return this.http.post<RolDTO>(this.URL, dto);
  }

  /**
   * @description Actualiza integralmente la información de un rol existente.
   * También se utiliza para ejecutar la restauración (reactivación) de registros en la UI.
   * @param id Identificador único del rol a modificar.
   * @param dto Objeto DTO con los datos actualizados.
   * @returns Observable con el registro modificado.
   */
  actualizar(id: number, dto: RolDTO): Observable<RolDTO> {
    return this.http.put<RolDTO>(`${this.URL}/${id}`, dto);
  }

  /**
   * @description Ejecuta la desactivación (eliminación lógica) de un rol en el sistema,
   * revocando indirectamente su disponibilidad para nuevas asignaciones.
   * @param id Identificador único a desactivar.
   * @returns Observable vacío que se completa al confirmar la operación.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }

  /**
   * @description Obtiene los nombres estandarizados de los roles directamente desde el Enum
   * del backend (Spring Boot). Útil para garantizar la consistencia de datos al crear roles.
   * @returns Observable con un arreglo de cadenas de texto (nombres de los Enums).
   */
  listarRolesEnum(): Observable<string[]> {
    return this.http.get<string[]>(`${this.URL}/enum`);
  }
}
