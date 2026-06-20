export interface DetalleIngresoRequestDTO {
  idProducto: number;
  cantidad: number;
  precioCompraUnitario: number;
  numerosSerie?: string[]; // Solo se llena si el producto es serializado
}

export interface IngresoCompraRequestDTO {
  idProveedor: number;
  idTipoComprobante: number;
  idLocal: number;
  serieComprobante: string;
  numeroComprobante: string;
  fechaIngreso: string | Date;
  impuesto: number;
  totalCompra: number;
  detalles: DetalleIngresoRequestDTO[];
}
