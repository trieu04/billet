import { ApiProperty } from '@nestjs/swagger'
export class CategoryResponseDto {
  @ApiProperty() id: string
  @ApiProperty() code: string
  @ApiProperty() name: string
  @ApiProperty() color: string
  @ApiProperty() icon: string
  @ApiProperty() sortOrder: number
}
