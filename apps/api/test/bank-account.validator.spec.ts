import { validateBankAccount } from '../src/disbursements/bank-account.validator';

// Public, non-personal IBAN examples from SWIFT IBAN Registry release 103 (Sep 2026):
// https://www.swift.com/swift-resource/9606/download (GB p.35, NI p.67).
const GB_EXAMPLE = 'GB29NWBK60161331926819';
const NI_EXAMPLE = 'NI45BAPR00000013000003558124';

describe('bank account validation', () => {
  it.each(['123456789', '100200300400', 'ABCD-1234'])(
    'keeps reasonable local account %s valid',
    (account) => {
      expect(validateBankAccount(account)).toEqual({ valid: true, type: 'LOCAL', normalizedValue: account });
    },
  );

  it('trims but does not alter a local account internally', () => {
    expect(validateBankAccount('  AbCd-1234  ')).toMatchObject({ valid: true, normalizedValue: 'AbCd-1234' });
  });

  it.each([
    ['', 'BANK_ACCOUNT_REQUIRED'],
    ['   ', 'BANK_ACCOUNT_REQUIRED'],
    ['@@@###', 'INVALID_BANK_ACCOUNT'],
    ['123', 'INVALID_BANK_ACCOUNT'],
  ])('rejects invalid local input %j', (account, errorCode) => {
    expect(validateBankAccount(account)).toMatchObject({ valid: false, type: 'LOCAL', errorCode });
  });

  it.each([GB_EXAMPLE, NI_EXAMPLE])('accepts a published SWIFT IBAN example', (iban) => {
    expect(validateBankAccount(iban)).toMatchObject({ valid: true, type: 'IBAN', normalizedValue: iban });
  });

  it('rejects a bad MOD-97 checksum instead of falling back to local', () => {
    expect(validateBankAccount('GB28NWBK60161331926819')).toMatchObject({
      valid: false, type: 'IBAN', errorCode: 'IBAN_INVALID_CHECKSUM',
    });
  });

  it('rejects a short IBAN candidate', () => {
    expect(validateBankAccount('GB29')).toMatchObject({ valid: false, type: 'IBAN', errorCode: 'IBAN_INVALID_FORMAT' });
  });

  it('rejects an unregistered country rather than accepting it as local', () => {
    expect(validateBankAccount('ZZ12ABCD1234567890123456')).toMatchObject({
      valid: false, type: 'IBAN', errorCode: 'IBAN_UNKNOWN_COUNTRY',
    });
  });

  it('removes presentation spaces and uppercases an IBAN', () => {
    expect(validateBankAccount('  gb29 nwbk 6016 1331 9268 19  ')).toMatchObject({
      valid: true, type: 'IBAN', normalizedValue: GB_EXAMPLE, countryCode: 'GB',
    });
  });
});
