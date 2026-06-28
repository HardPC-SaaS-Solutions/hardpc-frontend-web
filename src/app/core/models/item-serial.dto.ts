export enum Condicion {
  NUEVO = 'NUEVO',
  USADO = 'USADO',
  REACONDICIONADO = 'REACONDICIONADO',
  OPEN_BOX = 'OPEN_BOX',
  DEFECTUOSO = 'DEFECTUOSO'
}

export enum EstadoDisponibilidad {
  DISPONIBLE = 'DISPONIBLE',
  VENDIDO = 'VENDIDO',
  RESERVADO = 'RESERVADO',
  EN_GARANTIA = 'EN_GARANTIA',
  DADO_DE_BAJA = 'DADO_DE_BAJA',
  EN_TRANSITO = 'EN_TRANSITO',
  EN_REPARACION = 'EN_REPARACION',
  DEVUELTO_PROVEEDOR = 'DEVUELTO_PROVEEDOR'
}

export interface ItemSerialDTO {
  id?: number;

  // Datos enviados en Request
  idProducto: number;
  idLocal: number;
  numeroSerie: string;
  condicion: Condicion;
  estadoDisponibilidad?: EstadoDisponibilidad;
  fechaFinGarantia?: string | Date;
  idDetalleIngreso?: number;

  // Datos recibidos en Response (Aplanamiento)
  codigoSkuProducto?: string;
  descripcionProducto?: string;
  nombreLocal?: string;
}

export interface ResumenEstadoSerialDTO {
  idLocal: number;
  nombreLocal: string;
  estadoDisponibilidad: EstadoDisponibilidad;
  cantidad: number;
}
