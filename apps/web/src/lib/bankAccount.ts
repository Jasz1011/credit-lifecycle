import { ValidationErrorsIBAN, validateIBAN } from 'ibantools';

export type AccountErrorCode =
  | 'BANK_ACCOUNT_REQUIRED'
  | 'INVALID_BANK_ACCOUNT'
  | 'IBAN_UNKNOWN_COUNTRY'
  | 'IBAN_INVALID_FORMAT'
  | 'IBAN_INVALID_CHECKSUM'
  | 'IBAN_INVALID'
  | 'BANK_IBAN_MISMATCH';

export type AccountValidation =
  | { valid: true; type: 'LOCAL' | 'IBAN'; normalizedValue: string }
  | { valid: false; type: 'LOCAL' | 'IBAN'; normalizedValue: string; errorCode: AccountErrorCode };

export function validateBankAccountInput(input: string): AccountValidation {
  const value = input.trim();
  if (!value) return { valid: false, type: 'LOCAL', normalizedValue: value, errorCode: 'BANK_ACCOUNT_REQUIRED' };
  if (!/^[A-Za-z]{2}\d{2}/.test(value.replace(/ /g, ''))) {
    return /^[A-Za-z0-9-]{4,40}$/.test(value)
      ? { valid: true, type: 'LOCAL', normalizedValue: value }
      : { valid: false, type: 'LOCAL', normalizedValue: value, errorCode: 'INVALID_BANK_ACCOUNT' };
  }

  const normalizedValue = value.replace(/ /g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]*$/.test(normalizedValue)) {
    return { valid: false, type: 'IBAN', normalizedValue, errorCode: 'IBAN_INVALID_FORMAT' };
  }
  const result = validateIBAN(normalizedValue);
  if (result.valid) return { valid: true, type: 'IBAN', normalizedValue };
  const errorCode: AccountErrorCode = result.errorCodes.includes(ValidationErrorsIBAN.NoIBANCountry)
    ? 'IBAN_UNKNOWN_COUNTRY'
    : result.errorCodes.some((code) => [
      ValidationErrorsIBAN.WrongBBANLength,
      ValidationErrorsIBAN.WrongBBANFormat,
      ValidationErrorsIBAN.ChecksumNotNumber,
    ].includes(code))
      ? 'IBAN_INVALID_FORMAT'
      : result.errorCodes.includes(ValidationErrorsIBAN.WrongIBANChecksum)
        ? 'IBAN_INVALID_CHECKSUM'
        : 'IBAN_INVALID';
  return { valid: false, type: 'IBAN', normalizedValue, errorCode };
}
