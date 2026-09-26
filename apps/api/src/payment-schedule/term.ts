import { PaymentFrequency } from '@prisma/client';

export interface DerivedTerm {
  months: number;
  years: number;
}

export function deriveTerm(
  installmentCount: number,
  frequency: PaymentFrequency,
): DerivedTerm {
  const months =
    frequency === PaymentFrequency.MONTHLY
      ? installmentCount
      : frequency === PaymentFrequency.BIWEEKLY
        ? installmentCount / 2
        : installmentCount * 12;
  return { months, years: months / 12 };
}

