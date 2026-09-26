import { describe, expect, it } from 'vitest';
import { calculateAge, calculateLevelPayment } from './finance';

describe('frontend financial preview', () => {
  it('matches the monthly formula', () => {
    expect(calculateLevelPayment(10_000, 12, 12, 'MONTHLY')).toBeCloseTo(888.49, 2);
  });

  it('handles zero interest', () => {
    expect(calculateLevelPayment(10_000, 0, 4, 'MONTHLY')).toBe(2_500);
  });
});

describe('frontend age preview', () => {
  it('uses full birthday boundaries', () => {
    expect(calculateAge('1946-09-25', new Date('2026-09-24T12:00:00Z'))).toBe(79);
    expect(calculateAge('1945-09-24', new Date('2026-09-24T12:00:00Z'))).toBe(81);
  });
});

