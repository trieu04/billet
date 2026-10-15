import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { MediaController } from './controller'
import { MediaAssetEntity } from './entities/media-asset.entity'
import { MediaService } from './service'
@Module({
  imports: [TypeOrmModule.forFeature([MediaAssetEntity]), AuthModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
