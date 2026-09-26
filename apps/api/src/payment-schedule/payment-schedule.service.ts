import { Injectable } from '@nestjs/common';
import { PaymentFrequency, Prisma } from '@prisma/client';
import { PERIODS_PER_YEAR } from './financial-calculator.service';

export interface ScheduleInput {
  creditId: number;
  principalCents: number;
  annualRateBasisPoints: number;
  installmentCount: number;
  frequency: PaymentFrequency;
  levelPaymentCents: number;
  startDate: Date;
}

@Injectable()
export class PaymentScheduleService {
  build(input: ScheduleInput): Prisma.PaymentInstallmentCreateManyInput[] {
    const periodicRate =
      input.annualRateBasisPoints / 10_000 / PERIODS_PER_YEAR[input.frequency];
    let remainingCents = input.principalCents;
    const installments: Prisma.PaymentInstallmentCreateManyInput[] = [];

    for (let number = 1; number <= input.installmentCount; number += 1) {
      const interestCents = Math.round(remainingCents * periodicRate);
      const isLast = number === input.installmentCount;
      const principalCents = isLast
        ? remainingCents
        : Math.min(remainingCents, input.levelPaymentCents - interestCents);
      const paymentCents = principalCents + interestCents;
      remainingCents = Math.max(0, remainingCents - principalCents);

      installments.push({
        creditId: input.creditId,
        installmentNumber: number,
        dueDate: this.addPeriod(input.startDate, number, input.frequency),
        paymentAmountCents: paymentCents,
        principalAmountCents: principalCents,
        interestAmountCents: interestCents,
        remainingBalanceCents: remainingCents,
      });
    }
    return installments;
  }

  private addPeriod(date: Date, number: number, frequency: PaymentFrequency): Date {
    const result = new Date(date);
    if (frequency === PaymentFrequency.BIWEEKLY) {
      result.setUTCDate(result.getUTCDate() + 15 * number);
    } else if (frequency === PaymentFrequency.MONTHLY) {
      result.setUTCMonth(result.getUTCMonth() + number);
    } else {
      result.setUTCFullYear(result.getUTCFullYear() + number);
    }
    return result;
  }
}

