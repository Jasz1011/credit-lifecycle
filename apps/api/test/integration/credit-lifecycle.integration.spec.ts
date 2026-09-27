import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { ApplicationStatus, Bank, EmploymentType, PaymentFrequency } from '@prisma/client';
import { DisbursementsService } from '../../src/disbursements/disbursements.service';
import { FinancialCalculatorService } from '../../src/payment-schedule/financial-calculator.service';
import { PaymentScheduleService } from '../../src/payment-schedule/payment-schedule.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RiskCommitteeService } from '../../src/risk-committee/risk-committee.service';

describe('credit lifecycle with real isolated SQLite transactions', () => {
  let temporaryDirectory: string;
  let prisma: PrismaService;
  let risk: RiskCommitteeService;
  let disbursements: DisbursementsService;
  let schedules: PaymentScheduleService;
  const calculator = new FinancialCalculatorService();

  beforeAll(async () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'creditflow-integration-'));
    const sourcePrisma = resolve(__dirname, '../../prisma');
    const temporarySchema = join(temporaryDirectory, 'schema.prisma');
    cpSync(join(sourcePrisma, 'schema.prisma'), temporarySchema);
    cpSync(join(sourcePrisma, 'migrations'), join(temporaryDirectory, 'migrations'), { recursive: true });

    const prismaCli = resolve(dirname(require.resolve('prisma/package.json')), 'build/index.js');
    const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', temporarySchema], {
      cwd: temporaryDirectory,
      env: { ...process.env, DATABASE_URL: 'file:./integration-test.db' },
      encoding: 'utf8',
      timeout: 30_000,
    });
    if (migration.status !== 0) {
      throw new Error(`Temporary SQLite migration failed: ${migration.stderr || migration.stdout}`);
    }

    const databasePath = join(temporaryDirectory, 'integration-test.db').replaceAll(sep, '/');
    prisma = new PrismaService({ datasources: { db: { url: `file:${databasePath}` } } });
    await prisma.$connect();
    schedules = new PaymentScheduleService();
    risk = new RiskCommitteeService(prisma, calculator, schedules);
    disbursements = new DisbursementsService(prisma);
  }, 60_000);

  beforeEach(async () => {
    await prisma.disbursement.deleteMany();
    await prisma.paymentInstallment.deleteMany();
    await prisma.credit.deleteMany();
    await prisma.loanApplication.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (temporaryDirectory && temporaryDirectory.startsWith(`${tmpdir()}${sep}creditflow-integration-`)) {
      await rm(temporaryDirectory, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
    }
  }, 30_000);

  async function createUser() {
    const unique = randomUUID();
    return prisma.user.create({
      data: {
        username: `integration-${unique}`,
        email: `integration-${unique}@example.test`,
        fullName: 'Operador de integración',
        passwordHash: 'synthetic-test-only-hash',
      },
    });
  }

  async function createPendingApplication(createdById: number, options?: {
    annualRateBasisPoints?: number;
    installmentCount?: number;
    requestedAmountCents?: number;
  }) {
    const annualRateBasisPoints = options?.annualRateBasisPoints ?? 1_200;
    const installmentCount = options?.installmentCount ?? 12;
    const requestedAmountCents = options?.requestedAmountCents ?? 1_200_000;
    const unique = randomUUID();
    return prisma.loanApplication.create({
      data: {
        fullName: 'Cliente sintético',
        identification: `INTEGRATION-${unique}`,
        email: `client-${unique}@example.test`,
        phone: '88887766',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        employmentType: EmploymentType.SALARIED,
        workplace: 'Empresa sintética',
        employmentYears: 5,
        monthlyIncomeCents: 250_000,
        requestedAmountCents,
        installmentCount,
        annualInterestRateBasisPoints: annualRateBasisPoints,
        paymentFrequency: PaymentFrequency.MONTHLY,
        estimatedPaymentCents: calculator.calculateLevelPaymentCents(
          requestedAmountCents, annualRateBasisPoints, installmentCount, PaymentFrequency.MONTHLY,
        ),
        createdById,
      },
    });
  }

  async function approve(applicationId: number, reviewerId: number) {
    return risk.approve(applicationId, { observations: 'Evaluación sintética aprobada' }, reviewerId);
  }

  async function createCreditForState(status: ApplicationStatus) {
    const user = await createUser();
    const application = await createPendingApplication(user.id);
    if (status !== ApplicationStatus.PENDING) {
      await prisma.loanApplication.update({ where: { id: application.id }, data: { status } });
    }
    // This deliberately constructs an inconsistent legacy record to exercise the disbursement guard.
    const credit = await prisma.credit.create({
      data: {
        creditNumber: `TEST-${randomUUID()}`,
        levelPaymentCents: application.estimatedPaymentCents,
        loanApplicationId: application.id,
      },
    });
    return { user, application, credit };
  }

  it('persists one approved credit with reviewer and an uninterrupted 1..N schedule', async () => {
    const creator = await createUser();
    const reviewer = await createUser();
    const application = await createPendingApplication(creator.id, { installmentCount: 8 });
    const result = await approve(application.id, reviewer.id);
    const persisted = await prisma.loanApplication.findUniqueOrThrow({ where: { id: application.id } });
    const credits = await prisma.credit.findMany({ where: { loanApplicationId: application.id } });
    const installments = await prisma.paymentInstallment.findMany({
      where: { creditId: result.creditId }, orderBy: { installmentNumber: 'asc' },
    });

    expect(persisted.status).toBe(ApplicationStatus.APPROVED);
    expect(persisted.reviewedById).toBe(reviewer.id);
    expect(persisted.reviewedAt).toBeInstanceOf(Date);
    expect(credits).toHaveLength(1);
    expect(credits[0].loanApplicationId).toBe(application.id);
    expect(credits[0].creditNumber).toMatch(/^CR-\d{6,}$/);
    expect(result.creditNumber).toBe(credits[0].creditNumber);
    expect(await prisma.credit.count({ where: { creditNumber: result.creditNumber } })).toBe(1);
    expect(installments).toHaveLength(8);
    expect(installments.map((item) => item.installmentNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('persists rejection without creating a credit or installments', async () => {
    const creator = await createUser();
    const reviewer = await createUser();
    const application = await createPendingApplication(creator.id);
    await risk.reject(application.id, { observations: '' }, reviewer.id);
    const persisted = await prisma.loanApplication.findUniqueOrThrow({ where: { id: application.id } });

    expect(persisted.status).toBe(ApplicationStatus.REJECTED);
    expect(persisted.reviewedById).toBe(reviewer.id);
    expect(persisted.reviewedAt).toBeInstanceOf(Date);
    expect(await prisma.credit.count({ where: { loanApplicationId: application.id } })).toBe(0);
    expect(await prisma.paymentInstallment.count()).toBe(0);
  });

  it('persists a single disbursement only after approval', async () => {
    const creator = await createUser();
    const reviewer = await createUser();
    const processor = await createUser();
    const application = await createPendingApplication(creator.id);
    const approved = await approve(application.id, reviewer.id);
    await disbursements.disburse(approved.creditId, { bank: Bank.BAC_CREDOMATIC, accountNumber: '100200300400' }, processor.id);
    const persisted = await prisma.loanApplication.findUniqueOrThrow({ where: { id: application.id } });
    const records = await prisma.disbursement.findMany({ where: { creditId: approved.creditId } });

    expect(persisted.status).toBe(ApplicationStatus.DISBURSED);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      creditId: approved.creditId,
      processedById: processor.id,
      bank: Bank.BAC_CREDOMATIC,
      accountNumber: '100200300400',
      amountCents: application.requestedAmountCents,
    });
  });

  it.each([ApplicationStatus.PENDING, ApplicationStatus.REJECTED])(
    'does not disburse when the persisted application is %s', async (status) => {
      const { user, application, credit } = await createCreditForState(status);
      await expect(disbursements.disburse(credit.id, { bank: Bank.BANPRO, accountNumber: '123456789' }, user.id))
        .rejects.toMatchObject({ code: 'CREDIT_NOT_APPROVED' });
      expect((await prisma.loanApplication.findUniqueOrThrow({ where: { id: application.id } })).status).toBe(status);
      expect(await prisma.disbursement.count({ where: { creditId: credit.id } })).toBe(0);
    },
  );

  it('blocks a second approval without duplicate credit or installments', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id, { installmentCount: 7 });
    await approve(application.id, user.id);
    await expect(approve(application.id, user.id)).rejects.toMatchObject({ code: 'APPLICATION_ALREADY_PROCESSED' });
    const credits = await prisma.credit.findMany({ where: { loanApplicationId: application.id } });
    expect(credits).toHaveLength(1);
    expect(await prisma.paymentInstallment.count({ where: { creditId: credits[0].id } })).toBe(7);
    expect((await prisma.loanApplication.findUniqueOrThrow({ where: { id: application.id } })).status)
      .toBe(ApplicationStatus.APPROVED);
  });

  it('blocks a second disbursement without changing the persisted result', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id);
    const approved = await approve(application.id, user.id);
    const input = { bank: Bank.LAFISE, accountNumber: '123456789' };
    await disbursements.disburse(approved.creditId, input, user.id);
    await expect(disbursements.disburse(approved.creditId, input, user.id))
      .rejects.toMatchObject({ code: 'CREDIT_ALREADY_DISBURSED' });
    expect(await prisma.disbursement.count({ where: { creditId: approved.creditId } })).toBe(1);
    expect((await prisma.loanApplication.findUniqueOrThrow({ where: { id: application.id } })).status)
      .toBe(ApplicationStatus.DISBURSED);
  });

  it('enforces a unique credit per application in SQLite', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id);
    await approve(application.id, user.id);
    await expect(prisma.credit.create({ data: {
      creditNumber: `TEST-${randomUUID()}`,
      levelPaymentCents: application.estimatedPaymentCents,
      loanApplicationId: application.id,
    } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.credit.count({ where: { loanApplicationId: application.id } })).toBe(1);
  });

  it('enforces a unique disbursement per credit in SQLite', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id);
    const approved = await approve(application.id, user.id);
    await disbursements.disburse(approved.creditId, { bank: Bank.BANPRO, accountNumber: '123456789' }, user.id);
    await expect(prisma.disbursement.create({ data: {
      bank: Bank.BANPRO,
      accountNumber: '123456789',
      amountCents: application.requestedAmountCents,
      creditId: approved.creditId,
      processedById: user.id,
    } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.disbursement.count({ where: { creditId: approved.creditId } })).toBe(1);
  });

  it('enforces a unique installment number within a credit in SQLite', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id);
    const approved = await approve(application.id, user.id);
    const first = await prisma.paymentInstallment.findFirstOrThrow({ where: { creditId: approved.creditId } });
    await expect(prisma.paymentInstallment.create({ data: {
      creditId: approved.creditId,
      installmentNumber: first.installmentNumber,
      dueDate: first.dueDate,
      paymentAmountCents: first.paymentAmountCents,
      principalAmountCents: first.principalAmountCents,
      interestAmountCents: first.interestAmountCents,
      remainingBalanceCents: first.remainingBalanceCents,
    } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.paymentInstallment.count({ where: { creditId: approved.creditId } })).toBe(application.installmentCount);
  });

  it('persists a positive-rate schedule with financial invariants', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id, { installmentCount: 24 });
    const approved = await approve(application.id, user.id);
    const installments = await prisma.paymentInstallment.findMany({
      where: { creditId: approved.creditId }, orderBy: { installmentNumber: 'asc' },
    });

    expect(installments).toHaveLength(application.installmentCount);
    expect(installments.reduce((sum, item) => sum + item.principalAmountCents, 0))
      .toBe(application.requestedAmountCents);
    expect(installments.at(-1)?.remainingBalanceCents).toBe(0);
    for (const installment of installments) {
      expect(installment.remainingBalanceCents).toBeGreaterThanOrEqual(0);
      expect(installment.paymentAmountCents).toBeGreaterThan(0);
      expect(installment.principalAmountCents).toBeGreaterThanOrEqual(0);
      expect(installment.interestAmountCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('persists a zero-rate schedule with no interest and a zero final balance', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id, {
      annualRateBasisPoints: 0, installmentCount: 24, requestedAmountCents: 1_200_000,
    });
    const approved = await approve(application.id, user.id);
    const installments = await prisma.paymentInstallment.findMany({
      where: { creditId: approved.creditId }, orderBy: { installmentNumber: 'asc' },
    });

    expect(installments).toHaveLength(24);
    expect(installments.every((item) => item.interestAmountCents === 0)).toBe(true);
    expect(installments.reduce((sum, item) => sum + item.principalAmountCents, 0)).toBe(application.requestedAmountCents);
    expect(installments.at(-1)?.remainingBalanceCents).toBe(0);
  });

  it('rolls back the state transition and credit creation if schedule generation fails', async () => {
    const user = await createUser();
    const application = await createPendingApplication(user.id);
    jest.spyOn(schedules, 'build').mockImplementationOnce(() => {
      throw new Error('test-only schedule failure');
    });

    await expect(approve(application.id, user.id)).rejects.toThrow('test-only schedule failure');
    const persisted = await prisma.loanApplication.findUniqueOrThrow({ where: { id: application.id } });
    expect(persisted.status).toBe(ApplicationStatus.PENDING);
    expect(persisted.reviewedById).toBeNull();
    expect(persisted.reviewedAt).toBeNull();
    expect(await prisma.credit.count({ where: { loanApplicationId: application.id } })).toBe(0);
    expect(await prisma.paymentInstallment.count()).toBe(0);
  });
});
