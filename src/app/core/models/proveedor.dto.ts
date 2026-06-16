export interface ProveedorDTO {
  id?: number;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion: string;
  telefono: string;
  email: string;
  estado?: boolean;
}
