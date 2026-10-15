import { Global, Module } from '@nestjs/common'
import { OBJECT_STORAGE } from './interface'
import { LocalObjectStorage } from './local.service'
@Global()
@Module({
  providers: [LocalObjectStorage, { provide: OBJECT_STORAGE, useExisting: LocalObjectStorage }],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
