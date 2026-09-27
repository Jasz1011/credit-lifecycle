import {
  ApplicationStatus,
  Bank,
  EmploymentType,
  InstallmentStatus,
  PaymentFrequency,
  type Credit,
  type Disbursement,
  type LoanApplication,
  type PaymentInstallment,
} from '@prisma/client';
import { CreditsService } from '../src/credits/credits.service';
import { presentOperationalHistory } from '../src/credits/credits.presenter';
import { presentRiskCase } from '../src/risk-committee/risk-committee.presenter';
import { PrismaService } from '../src/prisma/prisma.service';

const application: LoanApplication = {
  id: 7,
  fullName: 'Cliente QA',
  identification: 'HISTORY-001',
  email: 'private@example.com',
  phone: '88887766',
  birthDate: new Date('1990-01-01T00:00:00.000Z'),
  employmentType: EmploymentType.SALARIED,
  workplace: 'Empresa privada',
  employmentYears: 4,
  monthlyIncomeCents: 200_000,
  requestedAmountCents: 100_000,
  installmentCount: 1,
  annualInterestRateBasisPoints: 0,
  paymentFrequency: PaymentFrequency.MONTHLY,
  estimatedPaymentCents: 100_000,
  status: ApplicationStatus.APPROVED,
  reviewObservations: 'No debe salir en el historial',
  reviewedAt: new Date('2026-09-26T14:38:00.000Z'),
  createdAt: new Date('2026-09-26T14:32:00.000Z'),
  updatedAt: new Date('2026-09-26T14:38:00.000Z'),
  createdById: 1,
  reviewedById: 2,
};

const credit: Credit = {
  id: 3,
  creditNumber: 'CR-000003',
  levelPaymentCents: 100_000,
  createdAt: new Date('2026-09-26T14:39:00.000Z'),
  loanApplicationId: application.id,
};

const installment: PaymentInstallment = {
  id: 9,
  creditId: credit.id,
  installmentNumber: 1,
  dueDate: new Date('2026-10-26T14:39:00.000Z'),
  paymentAmountCents: 100_000,
  principalAmountCents: 100_000,
  interestAmountCents: 0,
  remainingBalanceCents: 0,
  status: InstallmentStatus.PENDING,
};

const disbursement: Disbursement = {
  id: 5,
  creditId: credit.id,
  bank: Bank.FICOHSA,
  accountNumber: '100200300400',
  amountCents: 100_000,
  processedAt: new Date('2026-09-26T14:51:00.000Z'),
  processedById: 3,
};

function fixture(disbursed = false) {
  return {
    ...credit,
    loanApplication: {
      ...application,
      status: disbursed ? ApplicationStatus.DISBURSED : ApplicationStatus.APPROVED,
      createdBy: { fullName: 'Creadora real', email: 'staff-private@example.com', passwordHash: 'private-hash' },
      reviewedBy: { fullName: 'Revisor real', email: 'reviewer-private@example.com' },
    },
    disbursement: disbursed
      ? { ...disbursement, processedBy: { fullName: 'Procesadora real', tokenHash: 'private-token-hash' } }
      : null,
    paymentInstallments: [installment],
  };
}

function serviceFor(value: ReturnType<typeof fixture>) {
  const findFirst = jest.fn().mockResolvedValue(value);
  const findUnique = jest.fn().mockResolvedValue(value);
  const prisma = { credit: { findFirst, findUnique } } as unknown as PrismaService;
  return { service: new CreditsService(prisma), findFirst, findUnique };
}

describe('operational history for payment schedules', () => {
  it('uses persisted application, review and credit data while leaving disbursement pending', async () => {
    const { service, findFirst } = serviceFor(fixture());
    const result = await service.searchByIdentification(' history-001 ');

    expect(result.history).toMatchObject({
      application: { registeredAt: application.createdAt, createdBy: 'Creadora real' },
      review: { reviewedAt: application.reviewedAt, reviewedBy: 'Revisor real', result: 'APPROVED' },
      credit: { createdAt: credit.createdAt, creditNumber: 'CR-000003' },
      disbursement: null,
    });
    expect(result.installments).toHaveLength(1);
    expect(result.installments[0]).toMatchObject({ installmentNumber: 1, remainingBalance: 0 });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { loanApplication: { identification: 'HISTORY-001' } },
      include: expect.objectContaining({
        loanApplication: { include: {
          createdBy: { select: { fullName: true } },
          reviewedBy: { select: { fullName: true } },
        } },
        disbursement: { include: { processedBy: { select: { fullName: true } } } },
      }),
    }));
  });

  it('returns actual disbursement details but never serializes a complete account or private fields', async () => {
    const { service } = serviceFor(fixture(true));
    const result = await service.searchByIdentification('HISTORY-001');
    expect(result.history.disbursement).toEqual({
      processedAt: disbursement.processedAt,
      processedBy: 'Procesadora real',
      bank: Bank.FICOHSA,
      maskedAccountNumber: '••••0400',
    });
    expect(result.credit.disbursement).toEqual({ bank: Bank.FICOHSA, processedAt: disbursement.processedAt });
    const payload = JSON.stringify(result);
    for (const privateValue of [
      disbursement.accountNumber, application.email, application.phone,
      application.birthDate.toISOString(), String(application.monthlyIncomeCents),
      'private-hash', 'private-token-hash', application.reviewObservations,
    ]) {
      expect(payload).not.toContain(privateValue);
    }
    for (const privateKey of ['accountNumber', 'passwordHash', 'tokenHash', 'email', 'phone', 'birthDate', 'monthlyIncomeCents']) {
      expect(payload).not.toContain(`"${privateKey}"`);
    }
  });

  it('keeps the direct payment-schedule response safe and its installment list intact', async () => {
    const { service, findUnique } = serviceFor(fixture(true));
    const result = await service.getSchedule(credit.id);
    expect(result.installments).toHaveLength(1);
    expect(result.history.credit.creditNumber).toBe(credit.creditNumber);
    expect(JSON.stringify(result)).not.toContain(disbursement.accountNumber);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: credit.id } }));
  });

  it('does not invent a committee review without a persisted review date', () => {
    const value = fixture();
    value.loanApplication.reviewedAt = null;
    expect(presentOperationalHistory(value).review).toBeNull();
  });

  it('masks even a four-character legacy account rather than exposing it in full', () => {
    const value = fixture(true);
    if (!value.disbursement) throw new Error('Missing fixture disbursement');
    value.disbursement.accountNumber = '1234';
    expect(presentOperationalHistory(value).disbursement?.maskedAccountNumber).toBe('••••234');
  });

  it('leaves the restricted Risk Committee presenter unchanged', () => {
    expect(Object.keys(presentRiskCase(application)).sort()).toEqual([
      'age', 'fullName', 'id', 'identification', 'installmentCount',
      'paymentFrequency', 'requestedAmount', 'term',
    ]);
  });
});
