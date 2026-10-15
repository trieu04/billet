import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { CategoryModule } from '../category/module'
import { MediaModule } from '../media/module'
import { RealtimeModule } from '../realtime/module'
import { RecognitionModule } from '../recognition/module'
import { ExpenseController } from './controller'
import { ExpenseEntity } from './entities/expense.entity'
import { ExpenseService } from './service'
@Module({
  imports: [
    TypeOrmModule.forFeature([ExpenseEntity]),
    AuthModule,
    CategoryModule,
    MediaModule,
    RealtimeModule,
    RecognitionModule,
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
