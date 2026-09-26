import {
  ApplicationStatus,
  EmploymentType,
  PaymentFrequency,
  type LoanApplication,
} from '@prisma/client';
import { AppException } from '../src/common/errors/app.exception';
import { FinancialCalculatorService } from '../src/payment-schedule/financial-calculator.service';
import { PaymentScheduleService } from '../src/payment-schedule/payment-schedule.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RiskCommitteeService } from '../src/risk-committee/risk-committee.service';

const application: LoanApplication = {
  id: 10,
  fullName: 'María López',
  identification: 'ID-100',
  email: 'maria@example.com',
  phone: '88888888',
  birthDate: new Date('1990-01-01T00:00:00Z'),
  employmentType: EmploymentType.SALARIED,
  workplace: 'Empresa',
  employmentYears: 5,
  monthlyIncomeCents: 150_000,
  requestedAmountCents: 1_000_000,
  installmentCount: 12,
  annualInterestRateBasisPoints: 1_200,
  paymentFrequency: PaymentFrequency.MONTHLY,
  estimatedPaymentCents: 88_849,
  status: ApplicationStatus.PENDING,
  reviewObservations: null,
  reviewedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  createdById: 1,
  reviewedById: null,
};

function createApprovalHarness(transitionCount = 1) {
  const tx = {
    loanApplication: {
      findUnique: jest.fn().mockResolvedValue(application),
      updateMany: jest.fn().mockResolvedValue({ count: transitionCount }),
    },
    credit: {
      create: jest.fn().mockResolvedValue({ id: 4 }),
      update: jest.fn().mockResolvedValue({ id: 4 }),
    },
    paymentInstallment: { createMany: jest.fn().mockResolvedValue({ count: 12 }) },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  } as unknown as PrismaService;
  const schedules = new PaymentScheduleService();
  const service = new RiskCommitteeService(
    prisma,
    new FinancialCalculatorService(),
    schedules,
  );
  return { service, tx, schedules };
}

describe('RiskCommitteeService', () => {
  it('requires observations for approval', async () => {
    const { service, tx } = createApprovalHarness();
    await expect(service.approve(10, { observations: '   ' }, 1)).rejects.toMatchObject({
      code: 'OBSERVATIONS_REQUIRED',
    });
    expect(tx.credit.create).not.toHaveBeenCalled();
  });

  it('creates exactly one credit and the requested number of installments', async () => {
    const { service, tx } = createApprovalHarness();
    const result = await service.approve(10, { observations: 'Capacidad verificada' }, 1);
    expect(tx.credit.create).toHaveBeenCalledTimes(1);
    expect(tx.paymentInstallment.createMany).toHaveBeenCalledTimes(1);
    const call = tx.paymentInstallment.createMany.mock.calls[0]?.[0] as { data: unknown[] };
    expect(call.data).toHaveLength(12);
    expect(result).toMatchObject({ creditNumber: 'CR-000004', installmentCount: 12 });
  });

  it('prevents a second approval using a conditional state update', async () => {
    const { service, tx } = createApprovalHarness(0);
    await expect(service.approve(10, { observations: 'Duplicada' }, 1)).rejects.toBeInstanceOf(AppException);
    expect(tx.credit.create).not.toHaveBeenCalled();
  });

  it('propagates schedule failures so the database transaction can roll back', async () => {
    const { service, tx, schedules } = createApprovalHarness();
    jest.spyOn(schedules, 'build').mockImplementation(() => {
      throw new Error('schedule failure');
    });
    await expect(service.approve(10, { observations: 'Aprobar' }, 1)).rejects.toThrow('schedule failure');
    expect(tx.paymentInstallment.createMany).not.toHaveBeenCalled();
  });

  it('rejects a pending application without creating a credit or installments', async () => {
    const prisma = {
      loanApplication: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new RiskCommitteeService(
      prisma,
      new FinancialCalculatorService(),
      new PaymentScheduleService(),
    );
    await expect(service.reject(10, { observations: 'No viable' }, 1)).resolves.toEqual({
      applicationId: 10,
      status: ApplicationStatus.REJECTED,
    });
  });
});

