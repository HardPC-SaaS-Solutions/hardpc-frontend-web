export interface PageResponseDTO<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
