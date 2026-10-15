import { Injectable } from '@nestjs/common'
import { createReadStream, promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ObjectStorage } from './interface'
@Injectable()
export class LocalObjectStorage implements ObjectStorage {
  private readonly root = process.env.OBJECT_STORAGE_PATH ?? '/tmp/billet-storage'
  async put(key: string, data: Buffer) {
    const path = this.path(key)
    await fs.mkdir(dirname(path), { recursive: true })
    await fs.writeFile(path, data, { mode: 0o600 })
  }
  open(key: string) {
    return createReadStream(this.path(key))
  }
  private path(key: string) {
    if (!/^[A-Za-z0-9/_-]+(?:\.csv)?$/.test(key) || key.includes('..'))
      throw new Error('Invalid storage key')
    return join(this.root, key)
  }
}
