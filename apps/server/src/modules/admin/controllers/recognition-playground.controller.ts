import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../../auth/interface'
import {
  PlaygroundMultipartDto,
  PlaygroundRequestDto,
  PlaygroundResponseDto,
} from '../../recognition/dtos/admin.dto'
import { PlaygroundService } from '../../recognition/services/playground.service'
import { AdminGuard } from '../guards/admin.guard'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/recognition/playground')
export class AdminRecognitionPlaygroundController {
  constructor(private readonly playground: PlaygroundService) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Try the decision provider on one image',
    description:
      'Calls the configured provider with system image types and categories. Nothing is stored. Provider failures return 200 with `status: unavailable`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: PlaygroundMultipartDto })
  @ApiOkResponse({ type: PlaygroundResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Per-minute playground limit reached.' })
  async run(
    @CurrentUser() user: AuthUser,
    @UploadedFile() image: { buffer: Buffer } | undefined,
    @Body() body: PlaygroundRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PlaygroundResponseDto> {
    if (!image) throw new BadRequestException('image is required')
    const disconnect = new AbortController()
    const onClose = () => {
      if (!res.writableFinished) disconnect.abort()
    }
    res.once('close', onClose)
    try {
      return await this.playground.run(user.id, image.buffer, body.locale, disconnect.signal)
    } finally {
      res.off('close', onClose)
    }
  }
}
