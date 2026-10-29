import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { CategoryResponseDto, CreateCategoryDto, UpdateCategoryDto } from './dto'
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
  list(@CurrentUser() user: AuthUser) {
    return this.categories.list(user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom expense category' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() input: CreateCategoryDto) {
    return this.categories.create(user.id, input)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom expense category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Body() input: UpdateCategoryDto,
  ) {
    return this.categories.update(user.id, id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Archive a custom expense category' })
  @ApiNoContentResponse()
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.categories.remove(user.id, id)
  }
}
