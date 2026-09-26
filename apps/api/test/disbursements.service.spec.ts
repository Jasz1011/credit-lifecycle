import { ApplicationStatus, Bank } from '@prisma/client';
import { DisbursementsService } from '../src/disbursements/disbursements.service';
import { PrismaService } from '../src/prisma/prisma.service';

interface CreditFixtureOptions {
  status: ApplicationStatus;
  disbursed?: boolean;
  transitionCount?: number;
}

function createHarness({ status, disbursed = false, transitionCount = 1 }: CreditFixtureOptions) {
  const tx = {
    credit: {
      findUnique: jest.fn().mockResolvedValue({
        id: 3,
        loanApplicationId: 8,
        loanApplication: { status, requestedAmountCents: 500_000 },
        disbursement: disbursed ? { id: 1 } : null,
      }),
    },
    loanApplication: {
      updateMany: jest.fn().mockResolvedValue({ count: transitionCount }),
    },
    disbursement: {
      create: jest.fn().mockResolvedValue({
        id: 9,
        bank: Bank.LAFISE,
        accountNumber: '12345678',
        processedAt: new Date('2026-09-24T00:00:00Z'),
      }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  } as unknown as PrismaService;
  return { service: new DisbursementsService(prisma), tx, prisma };
}

describe('DisbursementsService', () => {
  it('transitions an approved credit to disbursed', async () => {
    const { service, tx } = createHarness({ status: ApplicationStatus.APPROVED });
    await expect(service.disburse(3, { bank: Bank.LAFISE, accountNumber: '12345678' }, 1)).resolves.toMatchObject({
      creditId: 3,
      status: ApplicationStatus.DISBURSED,
    });
    expect(tx.disbursement.create).toHaveBeenCalledTimes(1);
  });

  it('keeps the existing BAC local-account flow compatible', async () => {
    const { service, tx } = createHarness({ status: ApplicationStatus.APPROVED });
    await service.disburse(3, { bank: Bank.BAC_CREDOMATIC, accountNumber: '100200300400' }, 1);
    expect(tx.disbursement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ bank: Bank.BAC_CREDOMATIC, accountNumber: '100200300400' }),
    }));
  });

  it('rejects an invalid IBAN before starting a disbursement transaction', async () => {
    const { service, tx } = createHarness({ status: ApplicationStatus.APPROVED });
    await expect(service.disburse(3, { bank: Bank.BAC_CREDOMATIC, accountNumber: 'GB28NWBK60161331926819' }, 1))
      .rejects.toMatchObject({ code: 'IBAN_INVALID_CHECKSUM' });
    expect(tx.disbursement.create).not.toHaveBeenCalled();
  });

  it('rejects a verified NI bank mismatch before starting a transaction', async () => {
    const { service, prisma } = createHarness({ status: ApplicationStatus.APPROVED });
    await expect(service.disburse(3, { bank: Bank.LAFISE, accountNumber: 'NI45BAPR00000013000003558124' }, 1))
      .rejects.toMatchObject({ code: 'BANK_IBAN_MISMATCH' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([ApplicationStatus.PENDING, ApplicationStatus.REJECTED])(
    'does not disburse a %s application',
    async (status) => {
      const { service, tx } = createHarness({ status });
      await expect(service.disburse(3, { bank: Bank.BANPRO, accountNumber: '12345678' }, 1)).rejects.toMatchObject({
        code: 'CREDIT_NOT_APPROVED',
      });
      expect(tx.disbursement.create).not.toHaveBeenCalled();
    },
  );

  it('prevents double disbursement', async () => {
    const { service, tx } = createHarness({ status: ApplicationStatus.DISBURSED, disbursed: true });
    await expect(service.disburse(3, { bank: Bank.FICOHSA, accountNumber: '12345678' }, 1)).rejects.toMatchObject({
      code: 'CREDIT_ALREADY_DISBURSED',
    });
    expect(tx.disbursement.create).not.toHaveBeenCalled();
  });

  it('stops if the approved state changed concurrently', async () => {
    const { service, tx } = createHarness({ status: ApplicationStatus.APPROVED, transitionCount: 0 });
    await expect(service.disburse(3, { bank: Bank.LAFISE, accountNumber: '12345678' }, 1)).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
    });
    expect(tx.disbursement.create).not.toHaveBeenCalled();
  });
});
