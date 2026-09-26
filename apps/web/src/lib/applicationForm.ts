import type { TFunction } from 'i18next';
import { z } from 'zod';
import { calculateAge, calculateLevelPayment } from './finance';
import type { PaymentFrequency } from '../types/api';

const frequencies: PaymentFrequency[] = ['BIWEEKLY', 'MONTHLY', 'ANNUAL'];

export function createApplicationSchema(t: TFunction, today = new Date()) {
  const todayIso = today.toISOString().slice(0, 10);
  return z.object({
    fullName: z.string().trim().min(1, t('validation.required')).max(150, t('validation.maxCharacters', { count: 150 })),
    identification: z.string().trim().min(1, t('validation.required')).regex(/^[A-Za-z0-9-]{5,30}$/, t('validation.identification')),
    email: z.string().trim().min(1, t('validation.required')).email(t('validation.email')),
    phone: z.string().trim().min(1, t('validation.required')).regex(/^\+?[0-9 ()-]{7,25}$/, t('validation.phone')),
    birthDate: z.string().min(1, t('validation.required')).superRefine((value, context) => {
      if (!value) return;
      const date = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.dateFormat') });
      } else if (value > todayIso) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.futureDate') });
      } else if (calculateAge(value, today) > 80) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: t('validation.age') });
      }
    }),
    employmentType: z.enum(['SALARIED', 'SELF_EMPLOYED'], {
      errorMap: () => ({ message: t('validation.employmentType') }),
    }),
    workplace: z.string().trim().min(1, t('validation.required')).max(180, t('validation.maxCharacters', { count: 180 })),
    employmentYears: z.number({ invalid_type_error: t('validation.required') }).int(t('validation.integer')).min(0, t('validation.nonNegative')).max(70, t('validation.maxValue', { count: 70 })),
    monthlyIncome: z.number({ invalid_type_error: t('validation.required') }).positive(t('validation.positive')).max(100000000, t('validation.maxValue', { count: 100000000 })),
    requestedAmount: z.number({ invalid_type_error: t('validation.required') }).positive(t('validation.positive')).max(100000000, t('validation.maxValue', { count: 100000000 })),
    installmentCount: z.number({ invalid_type_error: t('validation.required') }).int(t('validation.integer')).min(1, t('validation.positive')).max(600, t('validation.maxValue', { count: 600 })),
    annualInterestRate: z.number({ invalid_type_error: t('validation.required') }).min(0, t('validation.nonNegative')).max(100, t('validation.maxValue', { count: 100 })),
    paymentFrequency: z.enum(['BIWEEKLY', 'MONTHLY', 'ANNUAL'], {
      errorMap: () => ({ message: t('validation.paymentFrequency') }),
    }),
  });
}

export function getEstimatePreview(amount: number, rate: number, installments: number, frequency: string) {
  const hasAmount = Number.isFinite(amount) && amount > 0 && amount <= 100000000;
  const hasRate = Number.isFinite(rate) && rate >= 0 && rate <= 100;
  const hasInstallments = Number.isInteger(installments) && installments >= 1 && installments <= 600;
  const hasFrequency = frequencies.includes(frequency as PaymentFrequency);
  return {
    hasAmount,
    hasRate,
    hasInstallments,
    hasFrequency,
    estimatedPayment: hasAmount && hasRate && hasInstallments && hasFrequency
      ? calculateLevelPayment(amount, rate, installments, frequency as PaymentFrequency)
      : null,
  };
}
