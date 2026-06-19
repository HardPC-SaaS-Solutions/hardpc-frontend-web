export interface StockLocalDTO {
  id?: number;

  // Datos enviados en Request
  idProducto: number;
  idLocal: number;
  cantidadActual: number;
  stockMinimo: number;

  // Datos recibidos en Response (Aplanamiento de relaciones)
  codigoSkuProducto?: string;
  descripcionProducto?: string;
  nombreLocal?: string;
}
