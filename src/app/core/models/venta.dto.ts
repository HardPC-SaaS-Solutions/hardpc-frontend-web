export enum EstadoVenta {
  REGISTRADA = 'REGISTRADA',
  ANULADA = 'ANULADA'
}

export interface VentaRequestDTO {
  idCliente: number;
  idTipoComprobante: number;
  idFormaPago: number;
  idLocal: number;
  serieComprobante: string;
  numeroComprobante: string;
  impuesto: number;
  totalVenta: number;
  detalles: DetalleVentaRequestDTO[];
}

export interface DetalleVentaRequestDTO {
  idProducto: number;
  cantidad: number;
  descuento: number;
  numerosSerie?: string[]; // Obligatorio solo si el producto maestro es esSerializado === true
}

export interface VentaResponseDTO {
  idVenta: number;
  serieComprobante: string;
  numeroComprobante: string;
  fechaVenta: string | Date;
  idCliente: number;
  nombreCliente: string;
  idUsuario: number;
  username: string;
  idTipoComprobante: number;
  descripcionTipoComprobante: string;
  idFormaPago: number;
  descripcionFormaPago: string;
  idLocal: number;
  nombreLocal: string;
  impuesto: number;
  totalVenta: number;
  estadoVenta: EstadoVenta;
  detalles: DetalleVentaResponseDTO[];
}

export interface DetalleVentaResponseDTO {
  idDetalleVenta: number;
  idProducto: number;
  codigoSkuProducto: string;
  descripcionProducto: string;
  cantidad: number;
  precioVentaUnitario: number;
  descuento: number;
}

// --- DTOs PARA REPORTES (BI) ---
export interface IngresoMensualDTO {
  anio: number;
  mes: number;
  totalIngreso: number;
  cantidadVentas: number;
}

export interface VentasPorClienteDTO {
  idCliente: number;
  identificacionCliente: string;
  nombreAplanado: string;
  totalComprado: number;
  cantidadVentas: number;
}
