import { Module } from '@nestjs/common';
import { FinancialCalculatorService } from './financial-calculator.service';
import { PaymentScheduleService } from './payment-schedule.service';

@Module({
  providers: [FinancialCalculatorService, PaymentScheduleService],
  exports: [FinancialCalculatorService, PaymentScheduleService],
})
export class PaymentScheduleModule {}

