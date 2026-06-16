export interface FieldErrorDTO {
  campo: string;
  mensaje: string;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status: number;
  error: string;
  errorCode: string;
  message: string;
  path: string;
  detalles?: FieldErrorDTO[];
}
