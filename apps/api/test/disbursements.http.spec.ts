import { ApplicationStatus, Bank } from '@prisma/client';
import { composeIBAN } from 'ibantools';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { DisbursementsController } from '../src/disbursements/disbursements.controller';
import { DisbursementsService } from '../src/disbursements/disbursements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('POST /credits/:id/disburse account validation', () => {
  let app: INestApplication;
  let baseUrl: string;
  const tx = {
    credit: { findUnique: jest.fn().mockResolvedValue({
      id: 3, loanApplicationId: 8,
      loanApplication: { status: ApplicationStatus.APPROVED, requestedAmountCents: 500_000 },
      disbursement: null,
    }) },
    loanApplication: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    disbursement: { create: jest.fn().mockResolvedValue({
      id: 9, bank: Bank.BAC_CREDOMATIC, accountNumber: '100200300400', processedAt: new Date('2026-09-24T00:00:00Z'),
    }) },
  };
  const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DisbursementsController],
      providers: [DisbursementsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use((request: Request, _response: Response, next: NextFunction) => {
      request.user = { id: 1 };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function post(accountNumber: string, bank: Bank = Bank.BAC_CREDOMATIC) {
    return fetch(`${baseUrl}/credits/3/disburse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bank, accountNumber }),
    });
  }

  it('rejects an invalid IBAN over HTTP before any database transaction', async () => {
    const response = await post('GB28NWBK60161331926819');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400, code: 'IBAN_INVALID_CHECKSUM', message: 'The IBAN check digits are invalid.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps BAC Credomatic with the existing local account working over HTTP', async () => {
    const response = await post('100200300400');
    expect(response.status).toBe(201);
    expect(tx.disbursement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ bank: Bank.BAC_CREDOMATIC, accountNumber: '100200300400' }),
    }));
  });

  it('rejects a structurally valid IBAN with a verified bank mismatch before the transaction', async () => {
    const response = await post('ni45 bapr 0000 0013 0000 0355 8124', Bank.LAFISE);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400, code: 'BANK_IBAN_MISMATCH', message: 'The IBAN does not match the selected bank.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a CR partial-rule contradiction before starting a transaction', async () => {
    const iban = composeIBAN({ countryCode: 'CR', bban: `0102${'0'.repeat(14)}` });
    if (!iban) throw new Error('Could not compose synthetic CR IBAN');
    const response = await post(iban, Bank.LAFISE);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ statusCode: 400, code: 'BANK_IBAN_MISMATCH' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('accepts and normalizes a published SWIFT IBAN over HTTP', async () => {
    const response = await post('ni45 bapr 0000 0013 0000 0355 8124', Bank.BANPRO);
    expect(response.status).toBe(201);
    expect(tx.disbursement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ bank: Bank.BANPRO, accountNumber: 'NI45BAPR00000013000003558124' }),
    }));
  });

  it('does not turn an unmapped country into a bank incompatibility', async () => {
    const response = await post('GB29NWBK60161331926819', Bank.LAFISE);
    expect(response.status).toBe(201);
    expect(tx.disbursement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ bank: Bank.LAFISE, accountNumber: 'GB29NWBK60161331926819' }),
    }));
  });
});
