import { Module } from '@nestjs/common';
import { PaymentScheduleModule } from '../payment-schedule/payment-schedule.module';
import { RiskCommitteeController } from './risk-committee.controller';
import { RiskCommitteeService } from './risk-committee.service';

@Module({
  imports: [PaymentScheduleModule],
  controllers: [RiskCommitteeController],
  providers: [RiskCommitteeService],
})
export class RiskCommitteeModule {}

