import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { presentCredit, presentInstallment } from './credits.presenter';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const credit = await this.prisma.credit.findUnique({
      where: { id },
      include: { loanApplication: true, disbursement: true },
    });
    if (!credit) {
      throw new AppException('CREDIT_NOT_FOUND', 'Credit not found.', HttpStatus.NOT_FOUND);
    }
    return presentCredit(credit);
  }

  async listApproved() {
    const credits = await this.prisma.credit.findMany({
      where: { loanApplication: { status: ApplicationStatus.APPROVED } },
      include: { loanApplication: true, disbursement: true },
      orderBy: { createdAt: 'asc' },
    });
    return credits.map(presentCredit);
  }

  async getSchedule(id: number) {
    const credit = await this.prisma.credit.findUnique({
      where: { id },
      include: {
        loanApplication: true,
        disbursement: true,
        paymentInstallments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!credit) {
      throw new AppException('CREDIT_NOT_FOUND', 'Credit not found.', HttpStatus.NOT_FOUND);
    }
    return {
      credit: presentCredit(credit),
      installments: credit.paymentInstallments.map(presentInstallment),
    };
  }

  async searchByIdentification(identification: string) {
    const normalized = identification.trim().toUpperCase();
    if (!normalized) {
      throw new AppException(
        'IDENTIFICATION_REQUIRED',
        'Identification is required.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const credit = await this.prisma.credit.findFirst({
      where: { loanApplication: { identification: normalized } },
      include: {
        loanApplication: true,
        disbursement: true,
        paymentInstallments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!credit) {
      throw new AppException(
        'CREDIT_NOT_FOUND_FOR_IDENTIFICATION',
        'No credit exists for this identification.',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      credit: presentCredit(credit),
      installments: credit.paymentInstallments.map(presentInstallment),
    };
  }
}

