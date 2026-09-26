import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [pending, approved, rejected, disbursed] = await Promise.all([
      this.prisma.loanApplication.count({ where: { status: ApplicationStatus.PENDING } }),
      this.prisma.loanApplication.count({ where: { status: ApplicationStatus.APPROVED } }),
      this.prisma.loanApplication.count({ where: { status: ApplicationStatus.REJECTED } }),
      this.prisma.loanApplication.count({ where: { status: ApplicationStatus.DISBURSED } }),
    ]);
    return { pending, approved, rejected, disbursed };
  }
}

