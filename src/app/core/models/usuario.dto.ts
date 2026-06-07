export interface UsuarioDTO {
  id?: number;

  // Relaciones (Request)
  idTipoDocumento: number;
  idRol: number;

  // Relaciones aplanadas (Response)
  abreviaturaTipoDocumento?: string;
  nombreRol?: string;

  // Datos
  numeroDocumento: string;
  nombres?: string;
  apellidos?: string;
  telefono: string;
  email: string;
  direccion?: string;
  username: string;
  password?: string;
  avatarUrl?: string;
  estado?: boolean;
}
