import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CreditsModule } from './credits/credits.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DisbursementsModule } from './disbursements/disbursements.module';
import { HealthModule } from './health/health.module';
import { LoanApplicationsModule } from './loan-applications/loan-applications.module';
import { PrismaModule } from './prisma/prisma.module';
import { RiskCommitteeModule } from './risk-committee/risk-committee.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    LoanApplicationsModule,
    RiskCommitteeModule,
    CreditsModule,
    DisbursementsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}

