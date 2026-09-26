import type { Bank } from '@prisma/client';
import { verifiedBankIbanRules } from './verified-bank-iban-rules';

export type BankIbanMatchStatus = 'MATCH' | 'MISMATCH' | 'NOT_VERIFIABLE';

export interface BankIbanValidationResult {
  status: BankIbanMatchStatus;
  countryCode: string;
  detectedBankCode?: string;
  expectedBankCode?: string;
}

// Call only after registry-backed structural IBAN validation has passed.
export function validateBankIbanCompatibility(normalizedIban: string, bank: Bank): BankIbanValidationResult {
  const countryCode = normalizedIban.slice(0, 2);
  const rule = verifiedBankIbanRules[countryCode];
  if (!rule) return { status: 'NOT_VERIFIABLE', countryCode };

  const detectedBankCode = normalizedIban.slice(rule.bankCodeStart, rule.bankCodeStart + rule.bankCodeLength);
  const expectedBankCode = rule.bankCodes[bank];
  if (!expectedBankCode) {
    return {
      status: Object.values(rule.bankCodes).some((code) => code === detectedBankCode) ? 'MISMATCH' : 'NOT_VERIFIABLE',
      countryCode,
      detectedBankCode,
    };
  }
  return {
    status: detectedBankCode === expectedBankCode ? 'MATCH' : 'MISMATCH',
    countryCode,
    detectedBankCode,
    expectedBankCode,
  };
}
