import { Injectable } from '@nestjs/common'
import type { HealthResponseDto } from './dto'

@Injectable()
export class HealthService {
  check(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'billet-server',
      timestamp: new Date().toISOString(),
    }
  }
}
