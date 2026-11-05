import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'
import { isPositiveBigint } from '../validators/bigint'

@Injectable()
export class ParseBigIntPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (!isPositiveBigint(value)) {
      throw new BadRequestException('Validation failed (positive bigint string is expected)')
    }

    return value
  }
}
