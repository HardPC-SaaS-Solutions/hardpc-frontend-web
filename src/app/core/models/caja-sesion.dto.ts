export interface CajaSesionRequestDTO {
  idLocal: number;
  montoApertura: number;
}

export interface CajaSesionDTO {
  idCajaSesion: number;
  idLocal?: number; // Dependiendo de cómo aplanaste tu DTO en el backend
  local?: { idLocal: number; nombre: string }; // Por si retorna el objeto anidado
  fechaApertura: string;
  montoApertura: number;
  montoCierreEfectivoReal?: number;
  fechaCierre?: string;
  montoCierreSistema?: number;
  estado: string;
}
