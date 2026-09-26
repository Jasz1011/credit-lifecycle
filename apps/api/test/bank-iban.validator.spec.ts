import { Bank } from '@prisma/client';
import { composeIBAN, validateIBAN } from 'ibantools';
import { validateBankIbanCompatibility } from '../src/disbursements/bank-iban.validator';

// Synthetic BBANs use institution codes published by the BCN; ibantools derives
// the check digits. No customer account is used as a fixture.
function syntheticIban(countryCode: string, bankCode: string, accountDigits: number): string {
  const iban = composeIBAN({ countryCode, bban: `${bankCode}${'0'.repeat(accountDigits)}` });
  if (!iban || !validateIBAN(iban).valid) throw new Error(`Could not compose ${countryCode} test IBAN`);
  return iban;
}

describe('verified bank–IBAN compatibility', () => {
  it.each([
    [Bank.LAFISE, 'BCCE'],
    [Bank.FICOHSA, 'BUNO'],
    [Bank.BAC_CREDOMATIC, 'BAMC'],
    [Bank.BANPRO, 'BAPR'],
  ])('matches NI %s to its officially registered identifier', (bank, bankCode) => {
    expect(validateBankIbanCompatibility(syntheticIban('NI', bankCode, 20), bank)).toMatchObject({
      status: 'MATCH', countryCode: 'NI', detectedBankCode: bankCode, expectedBankCode: bankCode,
    });
  });

  it('rejects a known NI contradiction', () => {
    expect(validateBankIbanCompatibility(syntheticIban('NI', 'BAPR', 20), Bank.LAFISE)).toMatchObject({
      status: 'MISMATCH', detectedBankCode: 'BAPR', expectedBankCode: 'BCCE',
    });
  });

  it('rejects a second NI contradiction without changing the complete mappings', () => {
    expect(validateBankIbanCompatibility(syntheticIban('NI', 'BAMC', 20), Bank.FICOHSA)).toMatchObject({
      status: 'MISMATCH', detectedBankCode: 'BAMC', expectedBankCode: 'BUNO',
    });
  });

  it('matches the verified BAC identifier in Costa Rica', () => {
    expect(validateBankIbanCompatibility(syntheticIban('CR', '0102', 14), Bank.BAC_CREDOMATIC)).toMatchObject({
      status: 'MATCH', countryCode: 'CR', detectedBankCode: '0102',
    });
  });

  it.each([Bank.LAFISE, Bank.FICOHSA, Bank.BANPRO])(
    'rejects CR 0102 for %s because that code is verified as BAC', (bank) => {
      expect(validateBankIbanCompatibility(syntheticIban('CR', '0102', 14), bank)).toMatchObject({
        status: 'MISMATCH', countryCode: 'CR', detectedBankCode: '0102',
      });
    },
  );

  it('cannot resolve an unknown CR code for a bank without its own mapping', () => {
    expect(validateBankIbanCompatibility(syntheticIban('CR', '9999', 14), Bank.LAFISE)).toEqual({
      status: 'NOT_VERIFIABLE', countryCode: 'CR', detectedBankCode: '9999',
    });
  });

  it('does not infer a bank in Honduras without a registered rule', () => {
    expect(validateBankIbanCompatibility(syntheticIban('HN', 'CABF', 20), Bank.FICOHSA)).toEqual({
      status: 'NOT_VERIFIABLE', countryCode: 'HN',
    });
  });

  it('does not treat a country without bank mappings as a contradiction', () => {
    expect(validateBankIbanCompatibility('GB29NWBK60161331926819', Bank.LAFISE)).toEqual({
      status: 'NOT_VERIFIABLE', countryCode: 'GB',
    });
  });
});
