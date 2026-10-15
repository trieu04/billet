import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { BudgetController } from './controller'
import { MonthlyBudgetEntity } from './entities/monthly-budget.entity'
import { BudgetService } from './service'
@Module({
  imports: [TypeOrmModule.forFeature([MonthlyBudgetEntity]), AuthModule],
  controllers: [BudgetController],
  providers: [BudgetService],
})
export class BudgetModule {}
