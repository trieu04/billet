import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CategoryResponseDto } from './dto'
import { CategoryService } from './service'
@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categories: CategoryService) {}
  @Get()
  @ApiOperation({
    summary: 'List expense categories',
    description: 'Returns the ordered category catalog available when classifying expenses.',
  })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  list() {
    return this.categories.list()
  }
}
