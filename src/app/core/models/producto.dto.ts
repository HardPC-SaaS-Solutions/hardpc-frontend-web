export interface ProductoDTO {
  id?: number;
  codigoSku: string;
  descripcion: string;
  precioUsd: number;
  mesesGarantia: number;
  esSerializado: boolean;
  imagenUrl?: string;

  // Claves Foráneas (Para enviar en POST/PUT)
  idMarca: number;
  idCategoria: number;
  idUnidadMedida: number;

  // Nombres planos (Devueltos por el GET para no hacer Joins en el frontend)
  nombreMarca?: string;
  nombreCategoria?: string;
  descripcionUnidadMedida?: string;

  estado?: boolean;
}
