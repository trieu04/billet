import { Module } from '@nestjs/common'
import { EMAIL_DELIVERY } from './interface'
import { SmtpEmailService } from './services/smtp.service'

@Module({
  providers: [SmtpEmailService, { provide: EMAIL_DELIVERY, useExisting: SmtpEmailService }],
  exports: [EMAIL_DELIVERY],
})
export class EmailModule {}
