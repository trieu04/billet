import { Injectable } from '@nestjs/common'
import type { RecognitionProvider } from '../interface'
@Injectable()
export class DisabledRecognitionProvider implements RecognitionProvider {
  readonly name = 'disabled'
  async recognize(): Promise<never> {
    throw new Error('Receipt recognition provider is not configured')
  }
}
