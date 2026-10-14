import { ServiceUnavailableException } from '@nestjs/common'
import { SmtpEmailService } from './smtp.service'

describe('SmtpEmailService', () => {
  it('fails safely when email delivery is disabled', async () => {
    const service = new SmtpEmailService({
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
      from: '',
    })

    await expect(
      service.send({ to: 'user@example.com', subject: 'Test', text: 'Secret body' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
