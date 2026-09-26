import type { Bank } from '@prisma/client';

interface VerifiedBankIbanRule {
  bankCodeStart: number;
  bankCodeLength: number;
  bankCodes: Partial<Record<Bank, string>>;
}

// Positions are zero-based in the normalized IBAN, including country and check digits.
// Sources and review scope: docs/BANK_ACCOUNT_VALIDATION.md.
export const verifiedBankIbanRules: Readonly<Record<string, VerifiedBankIbanRule>> = {
  NI: {
    bankCodeStart: 4,
    bankCodeLength: 4,
    bankCodes: {
      LAFISE: 'BCCE',
      FICOHSA: 'BUNO',
      BAC_CREDOMATIC: 'BAMC',
      BANPRO: 'BAPR',
    },
  },
  CR: {
    bankCodeStart: 4,
    bankCodeLength: 4,
    bankCodes: {
      BAC_CREDOMATIC: '0102',
    },
  },
};
