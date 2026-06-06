export interface RolDTO {
  id?: number;
  nombre: string; // Se mapeará con el enum RolNombre del backend
  descripcion?: string;
  estado?: boolean;
}
