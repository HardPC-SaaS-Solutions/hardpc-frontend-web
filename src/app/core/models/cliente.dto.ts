export enum TipoCliente {
  PERSONA_NATURAL = 'PERSONA_NATURAL',
  EMPRESA = 'EMPRESA'
}

export interface ClienteDTO {
  id?: number;
  idTipoDocumento: number;
  abreviaturaTipoDocumento?: string;
  numeroDocumento: string;
  tipoCliente: TipoCliente;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado?: boolean;
}
