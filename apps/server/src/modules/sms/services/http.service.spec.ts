import { ServiceUnavailableException } from '@nestjs/common'
import { HttpSmsService } from './http.service'

describe('HttpSmsService', () => {
  it('fails safely when SMS delivery is disabled', async () => {
    const service = new HttpSmsService({
      enabled: false,
      providerUrl: '',
      apiToken: '',
      sender: 'Billet',
      timeoutMs: 10_000,
    })

    await expect(
      service.send({ to: '+84901234567', body: 'Private message' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
