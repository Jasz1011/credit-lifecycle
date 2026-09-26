import { calculateAge, isEligibleByAge } from '../src/loan-applications/domain/age';

describe('age eligibility', () => {
  const asOf = new Date('2026-09-24T12:00:00.000Z');

  it('allows an applicant aged 79', () => {
    const birthDate = new Date('1947-09-24T00:00:00.000Z');
    expect(calculateAge(birthDate, asOf)).toBe(79);
    expect(isEligibleByAge(birthDate, asOf)).toBe(true);
  });

  it('allows an applicant aged exactly 80', () => {
    const birthDate = new Date('1946-09-24T00:00:00.000Z');
    expect(calculateAge(birthDate, asOf)).toBe(80);
    expect(isEligibleByAge(birthDate, asOf)).toBe(true);
  });

  it('rejects an applicant aged 81', () => {
    const birthDate = new Date('1945-09-24T00:00:00.000Z');
    expect(calculateAge(birthDate, asOf)).toBe(81);
    expect(isEligibleByAge(birthDate, asOf)).toBe(false);
  });

  it('accounts for a birthday that has not happened yet', () => {
    expect(calculateAge(new Date('1946-09-25T00:00:00.000Z'), asOf)).toBe(79);
  });

  it('rejects a future birth date', () => {
    expect(isEligibleByAge(new Date('2027-01-01T00:00:00.000Z'), asOf)).toBe(false);
  });
});
