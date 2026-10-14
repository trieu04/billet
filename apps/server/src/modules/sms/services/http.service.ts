import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { smsConfig, type SmsConfig } from '../../../configs/app.config'
import type { SendSmsInput, SmsDelivery } from '../interface'

@Injectable()
export class HttpSmsService implements SmsDelivery {
  constructor(@Inject(smsConfig.KEY) private readonly config: SmsConfig) {}

  async send(input: SendSmsInput): Promise<void> {
    if (!this.config.enabled) {
      throw new ServiceUnavailableException('SMS delivery is not configured')
    }

    try {
      const response = await fetch(this.config.providerUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          to: input.to,
          body: input.body,
          sender: this.config.sender,
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      })
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`)
    } catch {
      throw new ServiceUnavailableException('SMS delivery failed')
    }
  }
}
