export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  TRASLADO = 'TRASLADO'
}

export interface MovimientoInventarioDTO {
  idMovimiento?: number;

  // Datos base del Request
  tipoMovimiento: TipoMovimiento;
  cantidad: number;
  idProducto: number;
  idUsuario?: number; // Opcional si lo toma del token JWT en el backend

  // Campos dinámicos del Request
  idLocalOrigen?: number;
  idLocalDestino?: number;
  idItemSerial?: number;
  observacion?: string;

  // Datos recibidos en Response (Auditoría y aplanamiento)
  fechaHora?: string | Date;
  codigoSkuProducto?: string;
  descripcionProducto?: string;
  numeroSerie?: string;
  nombreLocalOrigen?: string;
  nombreLocalDestino?: string;
  username?: string;
}
