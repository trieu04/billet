import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'

@Injectable()
export class ParseBigIntPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException('Validation failed (positive bigint string is expected)')
    }

    return value
  }
}
