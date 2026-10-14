import { Injectable, Logger, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint()

    response.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
      const message = `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs.toFixed(1)}ms`

      if (response.statusCode >= 500) this.logger.error(message)
      else if (response.statusCode >= 400) this.logger.warn(message)
      else this.logger.log(message)
    })

    next()
  }
}
