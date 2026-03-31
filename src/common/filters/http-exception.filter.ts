import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | any = 'Lỗi máy chủ nội bộ';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        // Handle validation errors or custom objects
        message = (exceptionResponse as any).message || exception.message;
        if (Array.isArray(message)) {
          message = message[0]; // Display the first error to keep it simple
        }
      } else {
        message = exception.message;
      }
    } else {
      // Unhandled exceptions
      message = exception.message || message;
    }

    response.status(status).json({
      success: false,
      message: message,
      data: null,
    });
  }
}
