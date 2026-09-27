import type {
  Credit,
  Disbursement,
  LoanApplication,
  PaymentInstallment,
  User,
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

export function presentScheduleCredit(credit: CreditWithApplication) {
  const presented = presentCredit(credit);
  return {
    ...presented,
    disbursement: presented.disbursement
      ? { bank: presented.disbursement.bank, processedAt: presented.disbursement.processedAt }
      : null,
  };
}

type OperationalHistorySource = Pick<Credit, 'createdAt' | 'creditNumber'> & {
  loanApplication: Pick<LoanApplication, 'createdAt' | 'reviewedAt'> & {
    createdBy: Pick<User, 'fullName'>;
    reviewedBy: Pick<User, 'fullName'> | null;
  };
  disbursement: (Pick<Disbursement, 'processedAt' | 'bank' | 'accountNumber'> & {
    processedBy: Pick<User, 'fullName'>;
  }) | null;
};

function maskAccountNumber(accountNumber: string): string {
  const visibleCount = Math.min(4, Math.max(0, accountNumber.length - 1));
  return `••••${visibleCount ? accountNumber.slice(-visibleCount) : ''}`;
}

export function presentOperationalHistory(credit: OperationalHistorySource) {
  const application = credit.loanApplication;
  return {
    application: { registeredAt: application.createdAt, createdBy: application.createdBy.fullName },
    review: application.reviewedAt
      ? { reviewedAt: application.reviewedAt, reviewedBy: application.reviewedBy?.fullName ?? null, result: 'APPROVED' as const }
      : null,
    credit: { createdAt: credit.createdAt, creditNumber: credit.creditNumber },
    disbursement: credit.disbursement
      ? {
          processedAt: credit.disbursement.processedAt,
          processedBy: credit.disbursement.processedBy.fullName,
          bank: credit.disbursement.bank,
          maskedAccountNumber: maskAccountNumber(credit.disbursement.accountNumber),
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
