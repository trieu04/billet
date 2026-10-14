import { Module } from '@nestjs/common'
import { SMS_DELIVERY } from './interface'
import { HttpSmsService } from './services/http.service'

@Module({
  providers: [HttpSmsService, { provide: SMS_DELIVERY, useExisting: HttpSmsService }],
  exports: [SMS_DELIVERY],
})
export class SmsModule {}
