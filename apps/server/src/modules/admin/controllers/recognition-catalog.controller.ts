import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { ParseBigIntPipe } from '../../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../../auth/interface'
import {
  AdminCatalogDto,
  AdminDefaultRuleDto,
  AdminImageTypeDto,
  UpdateDefaultRuleDto,
  UpdateImageTypeDto,
} from '../../recognition/dtos/admin.dto'
import { CatalogAdminService } from '../../recognition/services/catalog-admin.service'
import { AdminGuard } from '../guards/admin.guard'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/recognition')
export class AdminRecognitionCatalogController {
  constructor(private readonly catalog: CatalogAdminService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Get system image types, default rules, and suggestion parameters' })
  @ApiOkResponse({ type: AdminCatalogDto })
  get(): Promise<AdminCatalogDto> {
    return this.catalog.catalog()
  }

  @Patch('image-types/:key')
  @ApiOperation({ summary: 'Edit a system image type' })
  @ApiOkResponse({ type: AdminImageTypeDto })
  @ApiConflictResponse({ description: 'The image type changed since it was read.' })
  updateImageType(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() body: UpdateImageTypeDto,
  ): Promise<AdminImageTypeDto> {
    return this.catalog.updateImageType(user.id, key, body)
  }

  @Patch('default-rules/:id')
  @ApiOperation({ summary: 'Edit a system default rule' })
  @ApiOkResponse({ type: AdminDefaultRuleDto })
  @ApiConflictResponse({ description: 'The rule changed since it was read.' })
  updateDefaultRule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Body() body: UpdateDefaultRuleDto,
  ): Promise<AdminDefaultRuleDto> {
    return this.catalog.updateDefaultRule(user.id, id, body)
  }
}
