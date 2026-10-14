import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

export interface ApiErrorResponse {
  statusCode: number
  message: string | string[]
  error: string
  path: string
  timestamp: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const error = exception instanceof Error ? exception : new Error(String(exception))
      this.logger.error(
        `${request.method} ${request.originalUrl} ${statusCode}: ${error.message}`,
        error.stack,
      )
    }

    const details = this.getHttpExceptionDetails(exception)
    response.status(statusCode).json({
      statusCode,
      message: details.message,
      error: details.error,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse)
  }

  private getHttpExceptionDetails(exception: unknown): Pick<ApiErrorResponse, 'message' | 'error'> {
    if (!(exception instanceof HttpException)) {
      return { message: 'Internal server error', error: 'Internal Server Error' }
    }

    const response = exception.getResponse()
    if (typeof response === 'string') {
      return { message: response, error: exception.name }
    }

    const responseBody = response as Record<string, unknown>
    const message = responseBody.message
    const error = responseBody.error
    return {
      message:
        typeof message === 'string' ||
        (Array.isArray(message) && message.every((item) => typeof item === 'string'))
          ? message
          : exception.message,
      error: typeof error === 'string' ? error : exception.name,
    }
  }
}
