import { PaymentFrequency } from '@prisma/client';
import { FinancialCalculatorService } from '../src/payment-schedule/financial-calculator.service';

describe('FinancialCalculatorService', () => {
  const calculator = new FinancialCalculatorService();
  const principal = 1_000_000;

  it('calculates annual level payments', () => {
    expect(calculator.calculateLevelPaymentCents(principal, 1_000, 2, PaymentFrequency.ANNUAL)).toBe(576_190);
  });

  it('calculates monthly level payments', () => {
    expect(calculator.calculateLevelPaymentCents(principal, 1_200, 12, PaymentFrequency.MONTHLY)).toBe(88_849);
  });

  it('calculates biweekly level payments', () => {
    expect(calculator.calculateLevelPaymentCents(principal, 1_200, 24, PaymentFrequency.BIWEEKLY)).toBe(44_321);
  });

  it('handles zero interest without division by zero', () => {
    expect(calculator.calculateLevelPaymentCents(principal, 0, 3, PaymentFrequency.MONTHLY)).toBe(333_333);
  });
});

