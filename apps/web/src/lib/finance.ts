import type { PaymentFrequency } from '../types/api';

const periods: Record<PaymentFrequency, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 24,
};

export function calculateLevelPayment(
  amount: number,
  annualRatePercent: number,
  installmentCount: number,
  frequency: PaymentFrequency,
): number {
  if (amount <= 0 || annualRatePercent < 0 || installmentCount <= 0) return 0;
  if (annualRatePercent === 0) return amount / installmentCount;
  const periodicRate = annualRatePercent / 100 / periods[frequency];
  const factor = (1 + periodicRate) ** installmentCount;
  return amount * ((periodicRate * factor) / (factor - 1));
}

export function calculateAge(date: string, now = new Date()): number {
  if (!date) return 0;
  const birth = new Date(`${date}T00:00:00Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

