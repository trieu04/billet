import { Controller, Get, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../guards/admin.guard'

class AdminMeDto {
  @ApiProperty({ enum: [true] }) isAdmin: true
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/me')
export class AdminMeController {
  @Get()
  @ApiOperation({ summary: 'Check admin access' })
  @ApiOkResponse({ type: AdminMeDto })
  @ApiForbiddenResponse({ description: 'The account is not an admin.' })
  me(): AdminMeDto {
    return { isAdmin: true }
  }
}
