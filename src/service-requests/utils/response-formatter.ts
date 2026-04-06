import { HttpStatus } from '@nestjs/common';

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
}

export class ResponseFormatter {
  /**
   * Format successful response
   */
  static success<T>(
    data: T,
    message: string,
    statusCode: number = HttpStatus.OK,
  ): ApiResponse<T> {
    return {
      statusCode,
      message,
      data,
    };
  }

  /**
   * Format paginated response
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Lấy dữ liệu thành công',
  ): ApiResponse<T[]> & { total: number; page: number; limit: number } {
    return {
      statusCode: HttpStatus.OK,
      message,
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Format error response
   */
  static error(
    message: string,
    statusCode: number = HttpStatus.BAD_REQUEST,
    error?: string,
  ): ApiResponse {
    return {
      statusCode,
      message,
      error: error || message,
    };
  }
}
