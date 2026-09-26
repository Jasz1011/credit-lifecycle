import { Injectable } from '@nestjs/common';
import { PaymentFrequency } from '@prisma/client';

export const PERIODS_PER_YEAR: Record<PaymentFrequency, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 24,
};

@Injectable()
export class FinancialCalculatorService {
  calculateLevelPaymentCents(
    principalCents: number,
    annualRateBasisPoints: number,
    installmentCount: number,
    frequency: PaymentFrequency,
  ): number {
    if (principalCents <= 0 || installmentCount <= 0 || annualRateBasisPoints < 0) {
      throw new RangeError('Financial inputs must be positive and valid.');
    }

    if (annualRateBasisPoints === 0) {
      return Math.round(principalCents / installmentCount);
    }

    const annualRate = annualRateBasisPoints / 10_000;
    const periodicRate = annualRate / PERIODS_PER_YEAR[frequency];
    const factor = (1 + periodicRate) ** installmentCount;
    return Math.round(
      principalCents * ((periodicRate * factor) / (factor - 1)),
    );
  }
}

