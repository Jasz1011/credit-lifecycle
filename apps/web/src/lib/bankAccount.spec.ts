import { describe, expect, it } from 'vitest';
import { validateBankAccountInput } from './bankAccount';

// SWIFT IBAN Registry release 103 examples, not personal account data:
// https://www.swift.com/swift-resource/9606/download
const GB_EXAMPLE = 'GB29NWBK60161331926819';

describe('disbursement account input', () => {
  it.each(['123456789', '100200300400'])('accepts local account %s', (value) => {
    expect(validateBankAccountInput(value)).toMatchObject({ valid: true, type: 'LOCAL', normalizedValue: value });
  });

  it.each([
    ['', 'BANK_ACCOUNT_REQUIRED'],
    ['@@@###', 'INVALID_BANK_ACCOUNT'],
    ['GB28NWBK60161331926819', 'IBAN_INVALID_CHECKSUM'],
    ['GB29', 'IBAN_INVALID_FORMAT'],
    ['ZZ12ABCD1234567890123456', 'IBAN_UNKNOWN_COUNTRY'],
  ])('rejects %j with a human-mappable code', (value, errorCode) => {
    expect(validateBankAccountInput(value)).toMatchObject({ valid: false, errorCode });
  });

  it('accepts an official example and normalizes print formatting', () => {
    expect(validateBankAccountInput(' gb29 nwbk 6016 1331 9268 19 ')).toMatchObject({
      valid: true, type: 'IBAN', normalizedValue: GB_EXAMPLE,
    });
  });
});
