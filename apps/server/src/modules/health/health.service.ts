import { Injectable } from '@nestjs/common'

@Injectable()
export class HealthService {
  check(): { status: 'ok'; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'billet-server',
      timestamp: new Date().toISOString(),
    }
  }
}
