export type EmploymentType = 'SALARIED' | 'SELF_EMPLOYED';
export type PaymentFrequency = 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
export type Bank = 'LAFISE' | 'FICOHSA' | 'BAC_CREDOMATIC' | 'BANPRO';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

export interface Term {
  months: number;
  years: number;
}

export interface LoanApplication {
  id: number;
  fullName: string;
  identification: string;
  email: string;
  phone: string;
  birthDate: string;
  age: number;
  employmentType: EmploymentType;
  workplace: string;
  employmentYears: number;
  monthlyIncome: number;
  requestedAmount: number;
  installmentCount: number;
  annualInterestRate: number;
  paymentFrequency: PaymentFrequency;
  estimatedPayment: number;
  term: Term;
  status: ApplicationStatus;
  reviewObservations: string | null;
  createdAt: string;
}

export interface RiskCase {
  id: number;
  identification: string;
  fullName: string;
  age: number;
  installmentCount: number;
  paymentFrequency: PaymentFrequency;
  term: Term;
  requestedAmount: number;
}

export interface Credit {
  id: number;
  creditNumber: string;
  levelPayment: number;
  status: ApplicationStatus;
  identification: string;
  fullName: string;
  requestedAmount: number;
  annualInterestRate: number;
  installmentCount: number;
  paymentFrequency: PaymentFrequency;
  term: Term;
  createdAt: string;
  disbursement: null | { bank: Bank; accountNumber: string; processedAt: string };
}

export interface Installment {
  id: number;
  installmentNumber: number;
  dueDate: string;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  status: 'PENDING' | 'PAID';
}

export interface PaymentSchedule {
  credit: Credit;
  installments: Installment[];
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string | string[];
}
