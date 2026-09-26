import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { percentToBasisPoints, toCents } from '../common/utils/money';
import { FinancialCalculatorService } from '../payment-schedule/financial-calculator.service';
import { PrismaService } from '../prisma/prisma.service';
import { isEligibleByAge } from './domain/age';
import type { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { presentApplication } from './loan-applications.presenter';

@Injectable()
export class LoanApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: FinancialCalculatorService,
  ) {}

  async create(dto: CreateLoanApplicationDto, userId: number) {
    const birthDate = new Date(`${dto.birthDate}T00:00:00.000Z`);
    if (!isEligibleByAge(birthDate)) {
      throw new AppException(
        'APPLICANT_TOO_OLD',
        'Applicants older than 80 are not eligible.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const requestedAmountCents = toCents(dto.requestedAmount);
    const annualInterestRateBasisPoints = percentToBasisPoints(
      dto.annualInterestRate,
    );
    const estimatedPaymentCents = this.calculator.calculateLevelPaymentCents(
      requestedAmountCents,
      annualInterestRateBasisPoints,
      dto.installmentCount,
      dto.paymentFrequency,
    );

    try {
      const application = await this.prisma.loanApplication.create({
        data: {
          fullName: dto.fullName.trim(),
          identification: dto.identification.trim().toUpperCase(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone.trim(),
          birthDate,
          employmentType: dto.employmentType,
          workplace: dto.workplace.trim(),
          employmentYears: dto.employmentYears,
          monthlyIncomeCents: toCents(dto.monthlyIncome),
          requestedAmountCents,
          installmentCount: dto.installmentCount,
          annualInterestRateBasisPoints,
          paymentFrequency: dto.paymentFrequency,
          estimatedPaymentCents,
          createdById: userId,
        },
      });
      return presentApplication(application);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(
          'IDENTIFICATION_ALREADY_EXISTS',
          'An application already exists for this identification.',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async list() {
    const applications = await this.prisma.loanApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return applications.map(presentApplication);
  }

  async findOne(id: number) {
    const application = await this.prisma.loanApplication.findUnique({ where: { id } });
    if (!application) {
      throw new AppException('APPLICATION_NOT_FOUND', 'Application not found.', HttpStatus.NOT_FOUND);
    }
    return presentApplication(application);
  }
}

