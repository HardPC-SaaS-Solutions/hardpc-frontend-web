export interface GastoMensualDTO {
  anio: number;
  mes: number;
  totalGasto: number;
  cantidadCompras: number;
}

export interface GastoProveedorDTO {
  idProveedor: number;
  razonSocialProveedor: string;
  totalGasto: number;
  cantidadCompras: number;
}
