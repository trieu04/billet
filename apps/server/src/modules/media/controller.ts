import { Body, Controller, Get, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { CreateMediaDto, CreateMediaResponseDto, MediaResponseDto } from './dto'
import { MediaService } from './service'
@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post()
  @ApiOperation({
    summary: 'Create a media upload',
    description:
      'Reserves a media asset for the authenticated account before its image bytes are uploaded.',
  })
  @ApiCreatedResponse({ type: CreateMediaResponseDto })
  create(@CurrentUser() u: AuthUser, @Body() b: CreateMediaDto) {
    return this.media.create(u.id, b)
  }
  @Put(':id/content')
  @ApiOperation({
    summary: 'Upload media content',
    description:
      'Uploads the raw JPEG, PNG, or WebP bytes for a reserved media asset and marks it ready for use.',
  })
  @ApiConsumes('image/jpeg', 'image/png', 'image/webp')
  @ApiBody({
    description: 'Raw image bytes. The byte length must equal the size declared when reserving it.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiOkResponse({ type: MediaResponseDto })
  upload(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Req() req: Request,
  ) {
    const length = req.headers['content-length']
    return this.media.upload(u.id, id, req, typeof length === 'string' ? Number(length) : undefined)
  }
  @Get(':id')
  @ApiOperation({
    summary: 'Get media metadata',
    description: 'Returns upload status and metadata for a media asset owned by the account.',
  })
  @ApiOkResponse({ type: MediaResponseDto })
  get(@CurrentUser() u: AuthUser, @Param('id', ParseBigIntPipe) id: string) {
    return this.media.get(u.id, id)
  }
  @Get(':id/content')
  @ApiOperation({
    summary: 'Download media content',
    description: 'Streams the private image content of a ready media asset owned by the account.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({
    description: 'Private image bytes.',
    schema: { type: 'string', format: 'binary' },
  })
  async content(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
    @Res() res: Response,
  ) {
    const file = await this.media.open(u.id, id)
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Content-Length', file.size)
    res.setHeader('Cache-Control', 'private, max-age=300')
    file.stream.pipe(res)
  }
}
