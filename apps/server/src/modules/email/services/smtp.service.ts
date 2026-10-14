import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import nodemailer, { type Transporter } from 'nodemailer'
import { emailConfig, type EmailConfig } from '../../../configs/app.config'
import type { EmailDelivery, SendEmailInput } from '../interface'

@Injectable()
export class SmtpEmailService implements EmailDelivery {
  private readonly transporter: Transporter | null

  constructor(@Inject(emailConfig.KEY) private readonly config: EmailConfig) {
    this.transporter = config.enabled
      ? nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.user ? { user: config.user, pass: config.password } : undefined,
        })
      : null
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException('Email delivery is not configured')
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: input.replyTo,
      })
    } catch {
      throw new ServiceUnavailableException('Email delivery failed')
    }
  }
}
