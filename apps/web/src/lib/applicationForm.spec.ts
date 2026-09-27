import { createInstance } from 'i18next';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplicationSchema, getEstimatePreview } from './applicationForm';
import { formatTerm } from './term';
import { formatDateInput, parseDateInput } from './dateInput';
import es from '../i18n/locales/es.json';
import en from '../i18n/locales/en.json';

const translator = createInstance();
const today = new Date('2026-09-25T12:00:00Z');
const valid = {
  fullName: 'Cliente de prueba',
  identification: 'TEST-12345',
  email: 'prueba@test.com',
  phone: '88887766',
  birthDate: '1946-09-25',
  employmentType: 'SALARIED',
  workplace: 'Empresa',
  employmentYears: 5,
  monthlyIncome: 2000,
  requestedAmount: 12000,
  installmentCount: 24,
  annualInterestRate: 12,
  paymentFrequency: 'MONTHLY',
};

beforeAll(async () => {
  await translator.init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng: 'es',
    fallbackLng: 'es',
    initImmediate: false,
    interpolation: { escapeValue: false },
  });
});

beforeEach(async () => {
  await translator.changeLanguage('es');
});

function errorFor(field: string, value: unknown): string | undefined {
  const result = createApplicationSchema(translator.t, today).safeParse({ ...valid, [field]: value });
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('application form validation', () => {
  it.each([
    ['es', 'Este campo es obligatorio.', 'La fecha de nacimiento no puede ser futura.', 'No se permiten solicitantes mayores de 80 años.', 'Ingrese un correo electrónico válido.'],
    ['en', 'This field is required.', 'Date of birth cannot be in the future.', 'Applicants older than 80 are not allowed.', 'Enter a valid email address.'],
  ])('localizes required date, future date, age and email errors in %s', async (language, required, future, tooOld, email) => {
    await translator.changeLanguage(language);
    expect(errorFor('birthDate', '')).toBe(required);
    expect(errorFor('birthDate', '2030-01-01')).toBe(future);
    expect(errorFor('birthDate', '1945-09-25')).toBe(tooOld);
    expect(errorFor('email', 'prueba.com')).toBe(email);
  });

  it('accepts an applicant aged 79', () => {
    expect(errorFor('birthDate', '1947-09-25')).toBeUndefined();
  });

  it('accepts an applicant exactly 80 years old', () => {
    expect(createApplicationSchema(translator.t, today).safeParse(valid).success).toBe(true);
  });

  it('rejects an applicant older than 80', () => {
    expect(errorFor('birthDate', '1945-09-25')).toBe('No se permiten solicitantes mayores de 80 años.');
  });

  it('uses the future date message instead of the age message', () => {
    expect(errorFor('birthDate', '2030-01-01')).toBe('La fecha de nacimiento no puede ser futura.');
  });

  it('distinguishes a malformed date from a future date', () => {
    expect(errorFor('birthDate', '31/02/2020')).toBe('Ingrese una fecha válida con formato dd/mm/aaaa.');
  });

  it('uses human messages for empty enum selections in Spanish and English', async () => {
    expect(errorFor('employmentType', '')).toBe('Seleccione un tipo de empleo.');
    expect(errorFor('paymentFrequency', '')).toBe('Seleccione una periodicidad de pago.');
    await translator.changeLanguage('en');
    expect(errorFor('employmentType', '')).toBe('Select an employment type.');
    expect(errorFor('paymentFrequency', '')).toBe('Select a payment frequency.');
    await translator.changeLanguage('es');
  });

  it.each([
    ['identification', '', 'Este campo es obligatorio.'],
    ['identification', 'abc', 'Use entre 5 y 30 caracteres alfanuméricos o guiones.'],
    ['email', '', 'Este campo es obligatorio.'],
    ['email', 'prueba.com', 'Ingrese un correo electrónico válido.'],
    ['phone', '', 'Este campo es obligatorio.'],
    ['phone', 'abc', 'Ingrese un teléfono válido.'],
    ['requestedAmount', 0, 'Ingrese un valor mayor que cero.'],
    ['installmentCount', 2.5, 'Ingrese un número entero.'],
    ['annualInterestRate', -5, 'El valor no puede ser negativo.'],
  ])('validates %s with %s', (field, value, message) => {
    expect(errorFor(field, value)).toBe(message);
  });

  it('keeps valid email, phone, zero interest and whole installments', () => {
    expect(errorFor('email', 'prueba@test.com')).toBeUndefined();
    expect(errorFor('phone', '88887766')).toBeUndefined();
    expect(errorFor('annualInterestRate', 0)).toBeUndefined();
    expect(errorFor('installmentCount', 12)).toBeUndefined();
  });

  it('never returns a technical enum message for an invalid selection', () => {
    expect(errorFor('employmentType', 'OTHER')).toBe('Seleccione un tipo de empleo.');
    expect(errorFor('paymentFrequency', 'WEEKLY')).toBe('Seleccione una periodicidad de pago.');
  });
});

describe('localized date entry', () => {
  it('converts a valid displayed date to the ISO API value', () => {
    expect(parseDateInput('25/09/1946')).toBe('1946-09-25');
    expect(formatDateInput('1946-09-25')).toBe('25/09/1946');
    expect(parseDateInput('09/25/1946', 'en')).toBe('1946-09-25');
    expect(formatDateInput('1946-09-25', 'en')).toBe('09/25/1946');
  });

  it('rejects impossible dates and incomplete entry', () => {
    expect(parseDateInput('31/02/2020')).toBeNull();
    expect(parseDateInput('02/31/2020', 'en')).toBeNull();
    expect(parseDateInput('01/01/20')).toBeNull();
  });
});

describe('estimated summary', () => {
  it('does not calculate with invalid installments or other invalid parameters', () => {
    expect(getEstimatePreview(12000, 12, 2.5, 'MONTHLY').hasInstallments).toBe(false);
    expect(getEstimatePreview(12000, 12, 2.5, 'MONTHLY').estimatedPayment).toBeNull();
    expect(getEstimatePreview(0, 12, 24, 'MONTHLY').estimatedPayment).toBeNull();
    expect(getEstimatePreview(12000, -5, 24, 'MONTHLY').estimatedPayment).toBeNull();
    expect(getEstimatePreview(12000, 12, 24, '').estimatedPayment).toBeNull();
  });

  it('calculates zero interest without division by zero', () => {
    expect(getEstimatePreview(12000, 0, 24, 'MONTHLY').estimatedPayment).toBe(500);
  });
});

describe('term labels', () => {
  it('uses singular and plural years and months in both languages', async () => {
    expect(formatTerm({ months: 12, years: 1 }, translator.t)).toBe('1 año');
    expect(formatTerm({ months: 24, years: 2 }, translator.t)).toBe('2 años');
    expect(formatTerm({ months: 1, years: 0 }, translator.t)).toBe('1 mes');
    expect(formatTerm({ months: 2, years: 0 }, translator.t)).toBe('2 meses');
    await translator.changeLanguage('en');
    expect(formatTerm({ months: 12, years: 1 }, translator.t)).toBe('1 year');
    expect(formatTerm({ months: 24, years: 2 }, translator.t)).toBe('2 years');
    expect(formatTerm({ months: 1, years: 0 }, translator.t)).toBe('1 month');
    expect(formatTerm({ months: 2, years: 0 }, translator.t)).toBe('2 months');
  });
});

describe('translation catalogs', () => {
  it('keeps the Spanish and English UI keys aligned', () => {
    const keys = (value: unknown, prefix = ''): string[] => {
      if (typeof value !== 'object' || value === null) return [prefix];
      return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
    };
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });
});
