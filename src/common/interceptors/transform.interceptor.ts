import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Bỏ qua StreamableFile (file download) - không wrap trong JSON
        if (data instanceof StreamableFile) {
          return data;
        }

        // Retrieve the metadata message or use 'Thành công' as default
        let message = this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) || 'Thành công';
        
        // Ensure successful format (prevents double wrapping if data already has 'success'/'message' key)
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        return {
          success: true,
          message: message,
          data: data,
        };
      }),
    );
  }
}
