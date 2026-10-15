import type { Readable } from 'node:stream'
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE')
export interface ObjectStorage {
  put(key: string, data: Buffer): Promise<void>
  open(key: string): Readable
}
