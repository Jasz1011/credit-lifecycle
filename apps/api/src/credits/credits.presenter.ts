import type {
  Credit,
  Disbursement,
  LoanApplication,
  PaymentInstallment,
} from '@prisma/client';
import { basisPointsToPercent, fromCents } from '../common/utils/money';
import { deriveTerm } from '../payment-schedule/term';

type CreditWithApplication = Credit & {
  loanApplication: LoanApplication;
  disbursement?: Disbursement | null;
};

export function presentCredit(credit: CreditWithApplication) {
  const application = credit.loanApplication;
  return {
    id: credit.id,
    creditNumber: credit.creditNumber,
    levelPayment: fromCents(credit.levelPaymentCents),
    status: application.status,
    identification: application.identification,
    fullName: application.fullName,
    requestedAmount: fromCents(application.requestedAmountCents),
    annualInterestRate: basisPointsToPercent(
      application.annualInterestRateBasisPoints,
    ),
    installmentCount: application.installmentCount,
    paymentFrequency: application.paymentFrequency,
    term: deriveTerm(application.installmentCount, application.paymentFrequency),
    createdAt: credit.createdAt,
    disbursement: credit.disbursement
      ? {
          bank: credit.disbursement.bank,
          accountNumber: credit.disbursement.accountNumber,
          processedAt: credit.disbursement.processedAt,
        }
      : null,
  };
}

export function presentInstallment(installment: PaymentInstallment) {
  return {
    id: installment.id,
    installmentNumber: installment.installmentNumber,
    dueDate: installment.dueDate,
    paymentAmount: fromCents(installment.paymentAmountCents),
    principalAmount: fromCents(installment.principalAmountCents),
    interestAmount: fromCents(installment.interestAmountCents),
    remainingBalance: fromCents(installment.remainingBalanceCents),
    status: installment.status,
  };
}

