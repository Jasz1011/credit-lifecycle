import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { FinancialCalculatorService } from '../payment-schedule/financial-calculator.service';
import { PaymentScheduleService } from '../payment-schedule/payment-schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ApproveApplicationDto } from './dto/approve-application.dto';
import type { RejectApplicationDto } from './dto/reject-application.dto';
import { presentRiskCase } from './risk-committee.presenter';

@Injectable()
export class RiskCommitteeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: FinancialCalculatorService,
    private readonly schedules: PaymentScheduleService,
  ) {}

  async listPending() {
    const cases = await this.prisma.loanApplication.findMany({
      where: { status: ApplicationStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
    return cases.map(presentRiskCase);
  }

  async findCase(id: number) {
    const application = await this.prisma.loanApplication.findUnique({ where: { id } });
    if (!application) {
      throw new AppException('APPLICATION_NOT_FOUND', 'Application not found.', HttpStatus.NOT_FOUND);
    }
    return presentRiskCase(application);
  }

  async approve(id: number, dto: ApproveApplicationDto, reviewerId: number) {
    const observations = dto.observations.trim();
    if (!observations) {
      throw new AppException(
        'OBSERVATIONS_REQUIRED',
        'Observations are required for approval.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.loanApplication.findUnique({ where: { id } });
      if (!application) {
        throw new AppException('APPLICATION_NOT_FOUND', 'Application not found.', HttpStatus.NOT_FOUND);
      }
      const transitioned = await tx.loanApplication.updateMany({
        where: { id, status: ApplicationStatus.PENDING },
        data: {
          status: ApplicationStatus.APPROVED,
          reviewObservations: observations,
          reviewedAt: new Date(),
          reviewedById: reviewerId,
        },
      });
      if (transitioned.count !== 1) {
        throw new AppException(
          'APPLICATION_ALREADY_PROCESSED',
          'Only pending applications can be approved.',
          HttpStatus.CONFLICT,
        );
      }

      const levelPaymentCents = this.calculator.calculateLevelPaymentCents(
        application.requestedAmountCents,
        application.annualInterestRateBasisPoints,
        application.installmentCount,
        application.paymentFrequency,
      );
      const credit = await tx.credit.create({
        data: {
          creditNumber: `PENDING-${crypto.randomUUID()}`,
          levelPaymentCents,
          loanApplicationId: application.id,
        },
      });
      const creditNumber = `CR-${String(credit.id).padStart(6, '0')}`;
      await tx.credit.update({ where: { id: credit.id }, data: { creditNumber } });

      const installments = this.schedules.build({
        creditId: credit.id,
        principalCents: application.requestedAmountCents,
        annualRateBasisPoints: application.annualInterestRateBasisPoints,
        installmentCount: application.installmentCount,
        frequency: application.paymentFrequency,
        levelPaymentCents,
        startDate: new Date(),
      });
      await tx.paymentInstallment.createMany({ data: installments });
      return { applicationId: id, creditId: credit.id, creditNumber, installmentCount: installments.length };
    });
  }

  async reject(id: number, dto: RejectApplicationDto, reviewerId: number) {
    const result = await this.prisma.loanApplication.updateMany({
      where: { id, status: ApplicationStatus.PENDING },
      data: {
        status: ApplicationStatus.REJECTED,
        reviewObservations: dto.observations?.trim() || null,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
    if (result.count !== 1) {
      const exists = await this.prisma.loanApplication.count({ where: { id } });
      throw new AppException(
        exists ? 'APPLICATION_ALREADY_PROCESSED' : 'APPLICATION_NOT_FOUND',
        exists ? 'Only pending applications can be rejected.' : 'Application not found.',
        exists ? HttpStatus.CONFLICT : HttpStatus.NOT_FOUND,
      );
    }
    return { applicationId: id, status: ApplicationStatus.REJECTED };
  }
}

