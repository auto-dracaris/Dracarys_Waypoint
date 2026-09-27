/**
 * The single response envelope for the whole API — success and error alike.
 * List endpoints put `{ items, meta: { total, page, limit, totalPages } }`
 * in `data`.
 */
export class ApiResponseDto {
  statusCode: number;
  message: string;
  data?: any;

  constructor(statusCode: number, message: string, data?: any) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}
