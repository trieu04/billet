import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { UsersService } from './service'
import { UserSettingsEntity } from './entities/user-settings.entity'
import { UserController } from './controller'
import { AuthModule } from '../auth/module'

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserSettingsEntity]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
