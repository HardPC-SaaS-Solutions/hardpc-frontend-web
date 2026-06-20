export enum EstadoIngreso {
  REGISTRADO = 'REGISTRADO',
  ANULADO = 'ANULADO'
}

export interface DetalleIngresoResponseDTO {
  idDetalleIngreso: number;
  idProducto: number;
  codigoSkuProducto: string;
  descripcionProducto: string;
  cantidad: number;
  precioCompraUnitario: number;
}

export interface IngresoCompraResponseDTO {
  idIngreso: number;
  serieComprobante: string;
  numeroComprobante: string;
  fechaIngreso: string | Date;

  // Aplanamiento Foráneo
  idProveedor: number;
  razonSocialProveedor: string;
  idTipoComprobante: number;
  descripcionTipoComprobante: string;
  idUsuario: number;
  username: string;
  idLocal: number;
  nombreLocal: string;

  // Totales y Estados
  impuesto: number;
  totalCompra: number;
  estadoIngreso: EstadoIngreso;
  comprobanteDocUrl?: string;

  detalles: DetalleIngresoResponseDTO[];
}
