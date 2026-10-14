export interface SendSmsInput {
  to: string
  body: string
}

export interface SmsDelivery {
  send(input: SendSmsInput): Promise<void>
}

export const SMS_DELIVERY = Symbol('SMS_DELIVERY')
