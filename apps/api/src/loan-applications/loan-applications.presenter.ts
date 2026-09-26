import type { LoanApplication } from '@prisma/client';
import { basisPointsToPercent, fromCents } from '../common/utils/money';
import { calculateAge } from './domain/age';
import { deriveTerm } from '../payment-schedule/term';

export function presentApplication(application: LoanApplication) {
  return {
    id: application.id,
    fullName: application.fullName,
    identification: application.identification,
    email: application.email,
    phone: application.phone,
    birthDate: application.birthDate.toISOString().slice(0, 10),
    age: calculateAge(application.birthDate),
    employmentType: application.employmentType,
    workplace: application.workplace,
    employmentYears: application.employmentYears,
    monthlyIncome: fromCents(application.monthlyIncomeCents),
    requestedAmount: fromCents(application.requestedAmountCents),
    installmentCount: application.installmentCount,
    annualInterestRate: basisPointsToPercent(
      application.annualInterestRateBasisPoints,
    ),
    paymentFrequency: application.paymentFrequency,
    estimatedPayment: fromCents(application.estimatedPaymentCents),
    term: deriveTerm(application.installmentCount, application.paymentFrequency),
    status: application.status,
    reviewObservations: application.reviewObservations,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

