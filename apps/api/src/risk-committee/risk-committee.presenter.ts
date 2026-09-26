import type { LoanApplication } from '@prisma/client';
import { fromCents } from '../common/utils/money';
import { calculateAge } from '../loan-applications/domain/age';
import { deriveTerm } from '../payment-schedule/term';

export function presentRiskCase(application: LoanApplication) {
  return {
    id: application.id,
    identification: application.identification,
    fullName: application.fullName,
    age: calculateAge(application.birthDate),
    installmentCount: application.installmentCount,
    paymentFrequency: application.paymentFrequency,
    term: deriveTerm(application.installmentCount, application.paymentFrequency),
    requestedAmount: fromCents(application.requestedAmountCents),
  };
}
