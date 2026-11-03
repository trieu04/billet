import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  PayloadTooLargeException,
  Post,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../../auth/interface'
import {
  CreateInferenceDto,
  CreateInferenceMultipartDto,
  InferenceResponseDto,
} from '../dtos/inference.dto'
import { InferenceService } from '../services/inference.service'
import { isJpeg } from '../utils/jpeg'

/** Multer memory-storage file (only the fields used here). */
interface UploadedImage {
  fieldname: string
  size: number
  buffer: Buffer
}

export const DEADLINE_HEADER = 'x-billet-deadline-ms'

@ApiTags('suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense-inferences')
export class InferenceController {
  constructor(private readonly inferences: InferenceService) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Suggest image type, category, and personal choice for a photo',
    description:
      'Sends a compressed JPEG to the configured decision provider within the deadline and returns its selections from the server-built choice set. The image is not stored. Provider failures return 200 with `status: unavailable` and a `reason`; suggestions turned off return `status: disabled`. Repeating a `clientRequestId` returns the stored result.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateInferenceMultipartDto })
  @ApiHeader({
    name: 'X-Billet-Deadline-Ms',
    required: false,
    description:
      'Remaining client budget in milliseconds. The server uses min(this, EXPENSE_DECISION_TIMEOUT_MS) and skips the provider below 1000 ms.',
  })
  @ApiOkResponse({ type: InferenceResponseDto })
  @ApiBadRequestResponse({ description: 'Missing image or invalid fields.' })
  @ApiPayloadTooLargeResponse({ description: 'Image larger than the configured limit.' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Image is not a JPEG.' })
  async create(
    @CurrentUser() user: AuthUser,
    @UploadedFile() image: UploadedImage | undefined,
    @Body() body: CreateInferenceDto,
    @Headers(DEADLINE_HEADER) deadlineHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<InferenceResponseDto> {
    const receivedAt = Date.now()
    if (!image) throw new BadRequestException('image is required')
    if (image.size > this.inferences.maxImageBytes)
      throw new PayloadTooLargeException('image is too large')
    if (!isJpeg(image.buffer)) throw new UnsupportedMediaTypeException('image must be a JPEG')
    validateTimezone(body.timezone)
    const deadlineMs = parseDeadline(deadlineHeader)

    // Abort the provider call when the client goes away before the response is written.
    const disconnect = new AbortController()
    const onClose = () => {
      if (!res.writableFinished) disconnect.abort()
    }
    res.once('close', onClose)
    try {
      return await this.inferences.infer(user.id, {
        image: new Uint8Array(image.buffer.buffer, image.buffer.byteOffset, image.buffer.length),
        clientRequestId: body.clientRequestId,
        locale: body.locale,
        placeKey: body.placeKey ?? null,
        deadlineMs,
        signal: disconnect.signal,
        receivedAt,
      })
    } finally {
      res.off('close', onClose)
    }
  }
}

function parseDeadline(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  if (!/^\d{1,7}$/.test(value.trim()))
    throw new BadRequestException('X-Billet-Deadline-Ms must be a non-negative integer')
  return Number(value.trim())
}

function validateTimezone(value: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
  } catch {
    throw new BadRequestException('Unknown timezone')
  }
}
