import { ValidationErrorsIBAN, validateIBAN } from 'ibantools';

export type BankAccountErrorCode =
  | 'BANK_ACCOUNT_REQUIRED'
  | 'INVALID_BANK_ACCOUNT'
  | 'IBAN_UNKNOWN_COUNTRY'
  | 'IBAN_INVALID_FORMAT'
  | 'IBAN_INVALID_CHECKSUM'
  | 'IBAN_INVALID';

export type BankAccountValidationResult =
  | { valid: true; type: 'LOCAL' | 'IBAN'; normalizedValue: string; countryCode?: string }
  | { valid: false; type: 'LOCAL' | 'IBAN'; normalizedValue: string; countryCode?: string; errorCode: BankAccountErrorCode };

const LOCAL_ACCOUNT_PATTERN = /^[A-Za-z0-9-]{4,40}$/;
const IBAN_PREFIX_PATTERN = /^[A-Za-z]{2}\d{2}/;

function validateLocalAccount(value: string): BankAccountValidationResult {
  return LOCAL_ACCOUNT_PATTERN.test(value)
    ? { valid: true, type: 'LOCAL', normalizedValue: value }
    : { valid: false, type: 'LOCAL', normalizedValue: value, errorCode: 'INVALID_BANK_ACCOUNT' };
}

function validateIban(value: string): BankAccountValidationResult {
  const normalizedValue = value.replace(/ /g, '').toUpperCase();
  const countryCode = normalizedValue.slice(0, 2);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]*$/.test(normalizedValue)) {
    return { valid: false, type: 'IBAN', normalizedValue, countryCode, errorCode: 'IBAN_INVALID_FORMAT' };
  }

  // The registry-backed library checks national length/BBAN shape and MOD-97.
  // Country-specific rules can be added here without changing the disbursement service.
  const result = validateIBAN(normalizedValue);
  if (result.valid) return { valid: true, type: 'IBAN', normalizedValue, countryCode };
  const errorCode: BankAccountErrorCode = result.errorCodes.includes(ValidationErrorsIBAN.NoIBANCountry)
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
  return { valid: false, type: 'IBAN', normalizedValue, countryCode, errorCode };
}

export function validateBankAccount(input: string): BankAccountValidationResult {
  const value = input.trim();
  if (!value) return { valid: false, type: 'LOCAL', normalizedValue: value, errorCode: 'BANK_ACCOUNT_REQUIRED' };
  // Two letters and two check digits identify an IBAN candidate. It must not fall
  // back to the generic local rule when its registry format or checksum fails.
  return IBAN_PREFIX_PATTERN.test(value.replace(/ /g, ''))
    ? validateIban(value)
    : validateLocalAccount(value);
}
