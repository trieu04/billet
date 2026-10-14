export interface SendEmailInput {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}

export interface EmailDelivery {
  send(input: SendEmailInput): Promise<void>
}

export const EMAIL_DELIVERY = Symbol('EMAIL_DELIVERY')
