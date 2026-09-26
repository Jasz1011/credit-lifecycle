-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "RefreshToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "replacedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");

CREATE TABLE "LoanApplication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "identification" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "employmentType" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "employmentYears" INTEGER NOT NULL,
    "monthlyIncomeCents" INTEGER NOT NULL,
    "requestedAmountCents" INTEGER NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "annualInterestRateBasisPoints" INTEGER NOT NULL,
    "paymentFrequency" TEXT NOT NULL,
    "estimatedPaymentCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewObservations" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    CONSTRAINT "LoanApplication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoanApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LoanApplication_identification_key" ON "LoanApplication"("identification");
CREATE INDEX "LoanApplication_status_createdAt_idx" ON "LoanApplication"("status", "createdAt");
CREATE INDEX "LoanApplication_fullName_idx" ON "LoanApplication"("fullName");

CREATE TABLE "Credit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creditNumber" TEXT NOT NULL,
    "levelPaymentCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loanApplicationId" INTEGER NOT NULL,
    CONSTRAINT "Credit_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Credit_creditNumber_key" ON "Credit"("creditNumber");
CREATE UNIQUE INDEX "Credit_loanApplicationId_key" ON "Credit"("loanApplicationId");

CREATE TABLE "PaymentInstallment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paymentAmountCents" INTEGER NOT NULL,
    "principalAmountCents" INTEGER NOT NULL,
    "interestAmountCents" INTEGER NOT NULL,
    "remainingBalanceCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "creditId" INTEGER NOT NULL,
    CONSTRAINT "PaymentInstallment_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "Credit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentInstallment_creditId_installmentNumber_key" ON "PaymentInstallment"("creditId", "installmentNumber");
CREATE INDEX "PaymentInstallment_creditId_dueDate_idx" ON "PaymentInstallment"("creditId", "dueDate");

CREATE TABLE "Disbursement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bank" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditId" INTEGER NOT NULL,
    "processedById" INTEGER NOT NULL,
    CONSTRAINT "Disbursement_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "Credit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Disbursement_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Disbursement_creditId_key" ON "Disbursement"("creditId");

