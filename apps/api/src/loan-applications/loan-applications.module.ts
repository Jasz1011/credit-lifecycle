import { Module } from '@nestjs/common';
import { PaymentScheduleModule } from '../payment-schedule/payment-schedule.module';
import { LoanApplicationsController } from './loan-applications.controller';
import { LoanApplicationsService } from './loan-applications.service';

@Module({
  imports: [PaymentScheduleModule],
  controllers: [LoanApplicationsController],
  providers: [LoanApplicationsService],
})
export class LoanApplicationsModule {}

