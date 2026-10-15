import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomBytes } from 'node:crypto'
import { Repository } from 'typeorm'
import type { Readable } from 'node:stream'
import { OBJECT_STORAGE, type ObjectStorage } from '../../common/storage/interface'
import type { CreateMediaDto } from './dto'
import { MediaAssetEntity, MediaStatus } from './entities/media-asset.entity'
@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAssetEntity) private readonly media: Repository<MediaAssetEntity>,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}
  async create(userId: string, input: CreateMediaDto) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(input.mimeType))
      throw new BadRequestException('Only JPEG, PNG, and WebP images are supported')
    const key = `${userId}/${randomBytes(24).toString('hex')}`
    const row = await this.media.save(
      this.media.create({
        userId,
        storageKey: key,
        thumbnailKey: null,
        mimeType: input.mimeType,
        sizeBytes: String(input.sizeBytes),
        width: null,
        height: null,
        status: MediaStatus.Pending,
        failureReason: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    )
    return { ...this.response(row), uploadUrl: `/api/v1/media/${row.id}/content` }
  }
  async upload(userId: string, id: string, stream: Readable, contentLength: number | undefined) {
    const row = await this.owned(userId, id, true)
    if (row.status !== MediaStatus.Pending)
      throw new BadRequestException('Media is not awaiting upload')
    const declared = Number(row.sizeBytes)
    if (contentLength && contentLength !== declared)
      throw new BadRequestException('Content length does not match declaration')
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of stream) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
      size += value.length
      if (size > declared || size > 15_000_000) throw new PayloadTooLargeException()
      chunks.push(value)
    }
    if (size !== declared) throw new BadRequestException('Uploaded size does not match declaration')
    const data = Buffer.concat(chunks)
    const detected = detectImage(data)
    if (!detected || detected.mimeType !== row.mimeType) {
      row.status = MediaStatus.Failed
      row.failureReason = 'File content does not match its declared image type'
      await this.media.save(row)
      throw new BadRequestException(row.failureReason)
    }
    row.width = detected.width
    row.height = detected.height
    row.status = MediaStatus.Ready
    row.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await this.storage.put(`media/${row.storageKey}`, data)
    return this.response(await this.media.save(row))
  }
  async open(userId: string, id: string) {
    const row = await this.owned(userId, id, true)
    if (row.status !== MediaStatus.Ready) throw new BadRequestException('Media is not ready')
    try {
      return {
        stream: this.storage.open(`media/${row.storageKey}`),
        mimeType: row.mimeType,
        size: Number(row.sizeBytes),
      }
    } catch {
      throw new NotFoundException('Media content not found')
    }
  }
  async get(userId: string, id: string) {
    return this.response(await this.owned(userId, id, false))
  }
  async assertReady(userId: string, id: string) {
    const row = await this.owned(userId, id, false)
    if (row.status !== MediaStatus.Ready) throw new BadRequestException('Media is not ready')
    return row
  }
  private async owned(userId: string, id: string, storage = false) {
    const qb = this.media
      .createQueryBuilder('m')
      .where('m.id=:id AND m.userId=:userId', { id, userId })
    if (storage) qb.addSelect(['m.storageKey', 'm.thumbnailKey'])
    const row = await qb.getOne()
    if (!row) throw new NotFoundException('Media not found')
    return row
  }
  private response(row: MediaAssetEntity) {
    return {
      id: row.id,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      status: row.status,
      width: row.width,
      height: row.height,
      expiresAt: row.expiresAt.toISOString(),
      failureReason: row.failureReason,
    }
  }
}
export function detectImage(
  data: Buffer,
): { mimeType: string; width: number | null; height: number | null } | null {
  if (
    data.length >= 24 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mimeType: 'image/png', width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return { mimeType: 'image/jpeg', width: null, height: null }
  if (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  )
    return { mimeType: 'image/webp', width: null, height: null }
  return null
}
