import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'
export class BudgetQueryDto {
  @ApiProperty({ example: '2026-10' }) @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month: string
  @ApiProperty() @Matches(/^[A-Z]{3}$/) currency: string
}
export class SetBudgetDto extends BudgetQueryDto {
  @ApiProperty() @Matches(/^[1-9]\d*$/) limitMinor: string
}
