import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { validateBankAccount, type BankAccountErrorCode } from './bank-account.validator';
import { validateBankIbanCompatibility } from './bank-iban.validator';
import type { CreateDisbursementDto } from './dto/create-disbursement.dto';

const accountErrorMessages: Record<BankAccountErrorCode, string> = {
  BANK_ACCOUNT_REQUIRED: 'Bank account number is required.',
  INVALID_BANK_ACCOUNT: 'Enter a valid local bank account number.',
  IBAN_UNKNOWN_COUNTRY: 'The IBAN country format is not recognized.',
  IBAN_INVALID_FORMAT: 'The IBAN format is invalid.',
  IBAN_INVALID_CHECKSUM: 'The IBAN check digits are invalid.',
  IBAN_INVALID: 'The IBAN is invalid.',
};

@Injectable()
export class DisbursementsService {
  constructor(private readonly prisma: PrismaService) {}

  async disburse(creditId: number, dto: CreateDisbursementDto, userId: number) {
    const account = validateBankAccount(dto.accountNumber);
    if (!account.valid) {
      throw new AppException(account.errorCode, accountErrorMessages[account.errorCode], HttpStatus.BAD_REQUEST);
    }
    if (account.type === 'IBAN' && validateBankIbanCompatibility(account.normalizedValue, dto.bank).status === 'MISMATCH') {
      throw new AppException('BANK_IBAN_MISMATCH', 'The IBAN does not match the selected bank.', HttpStatus.BAD_REQUEST);
    }
    return this.prisma.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        where: { id: creditId },
        include: { loanApplication: true, disbursement: true },
      });
      if (!credit) {
        throw new AppException('CREDIT_NOT_FOUND', 'Credit not found.', HttpStatus.NOT_FOUND);
      }
      if (credit.disbursement || credit.loanApplication.status === ApplicationStatus.DISBURSED) {
        throw new AppException(
          'CREDIT_ALREADY_DISBURSED',
          'Credit has already been disbursed.',
          HttpStatus.CONFLICT,
        );
      }
      if (credit.loanApplication.status !== ApplicationStatus.APPROVED) {
        throw new AppException(
          'CREDIT_NOT_APPROVED',
          'Only approved credits can be disbursed.',
          HttpStatus.CONFLICT,
        );
      }

      const transitioned = await tx.loanApplication.updateMany({
        where: {
          id: credit.loanApplicationId,
          status: ApplicationStatus.APPROVED,
        },
        data: { status: ApplicationStatus.DISBURSED },
      });
      if (transitioned.count !== 1) {
        throw new AppException(
          'INVALID_STATE_TRANSITION',
          'The credit state changed before disbursement.',
          HttpStatus.CONFLICT,
        );
      }

      const disbursement = await tx.disbursement.create({
        data: {
          bank: dto.bank,
          accountNumber: account.normalizedValue,
          amountCents: credit.loanApplication.requestedAmountCents,
          creditId,
          processedById: userId,
        },
      });
      return {
        id: disbursement.id,
        creditId,
        bank: disbursement.bank,
        accountNumber: disbursement.accountNumber,
        status: ApplicationStatus.DISBURSED,
        processedAt: disbursement.processedAt,
      };
    });
  }
}
