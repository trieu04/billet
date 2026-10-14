import { ApiProperty } from '@nestjs/swagger'

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: 'ok'

  @ApiProperty({ example: 'billet-server' })
  service: string

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp: string
}
