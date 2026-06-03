export interface MarcaDTO {
  id?: number; // Opcional porque al crear una nueva, el ID lo genera la base de datos
  nombre: string;
  descripcion?: string;
  activo?: boolean; // Para el manejo de la eliminación lógica
}