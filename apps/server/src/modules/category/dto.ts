import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, Matches, MaxLength, MinLength } from 'class-validator'

export const CATEGORY_ICONS = [
  'book-open',
  'coffee',
  'file-text',
  'gift',
  'grid',
  'heart',
  'home',
  'map-pin',
  'navigation',
  'play-circle',
  'shopping-bag',
  'smartphone',
  'star',
  'tool',
] as const

export class CreateCategoryDto {
  @ApiProperty({ example: 'Cà phê' })
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  name: string

  @ApiProperty({ example: '#F4B89C', pattern: '^#[0-9A-Fa-f]{6}$' })
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color: string

  @ApiProperty({ enum: CATEGORY_ICONS, example: 'coffee' })
  @IsIn(CATEGORY_ICONS)
  icon: (typeof CATEGORY_ICONS)[number]
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Cà phê' })
  @IsOptional()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  name?: string

  @ApiPropertyOptional({ example: '#F4B89C', pattern: '^#[0-9A-Fa-f]{6}$' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string

  @ApiPropertyOptional({ enum: CATEGORY_ICONS, example: 'coffee' })
  @IsOptional()
  @IsIn(CATEGORY_ICONS)
  icon?: (typeof CATEGORY_ICONS)[number]
}

export class CategoryResponseDto {
  @ApiProperty() id: string
  @ApiProperty() code: string
  @ApiProperty() name: string
  @ApiProperty() color: string
  @ApiProperty() icon: string
  @ApiProperty() sortOrder: number
  @ApiProperty({ description: 'Expense count used to rank the category for this account.' })
  usageCount: number
  @ApiProperty({ description: 'Whether the category is owned and editable by this account.' })
  isCustom: boolean
}
