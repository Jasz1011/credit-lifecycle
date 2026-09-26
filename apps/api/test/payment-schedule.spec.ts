import { PaymentFrequency } from '@prisma/client';
import { FinancialCalculatorService } from '../src/payment-schedule/financial-calculator.service';
import { PaymentScheduleService } from '../src/payment-schedule/payment-schedule.service';

describe('PaymentScheduleService', () => {
  const calculator = new FinancialCalculatorService();
  const service = new PaymentScheduleService();

  it('creates exactly the requested installments and closes the balance', () => {
    const levelPaymentCents = calculator.calculateLevelPaymentCents(
      1_000_000, 1_200, 24, PaymentFrequency.MONTHLY,
    );
    const schedule = service.build({
      creditId: 7,
      principalCents: 1_000_000,
      annualRateBasisPoints: 1_200,
      installmentCount: 24,
      frequency: PaymentFrequency.MONTHLY,
      levelPaymentCents,
      startDate: new Date('2026-09-24T00:00:00.000Z'),
    });
    expect(schedule).toHaveLength(24);
    expect(schedule.at(-1)?.remainingBalanceCents).toBe(0);
    expect(schedule.reduce((total, item) => total + item.principalAmountCents, 0)).toBe(1_000_000);
  });

  it('creates a deterministic zero-rate schedule', () => {
    const schedule = service.build({
      creditId: 1,
      principalCents: 100_000,
      annualRateBasisPoints: 0,
      installmentCount: 3,
      frequency: PaymentFrequency.MONTHLY,
      levelPaymentCents: 33_333,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(schedule.map((item) => item.interestAmountCents)).toEqual([0, 0, 0]);
    expect(schedule.map((item) => item.paymentAmountCents)).toEqual([33_333, 33_333, 33_334]);
  });
});

