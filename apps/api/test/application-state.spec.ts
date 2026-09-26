import { ApplicationStatus } from '@prisma/client';
import { canTransition } from '../src/loan-applications/domain/application-state';

describe('application state transitions', () => {
  it.each([
    [ApplicationStatus.PENDING, ApplicationStatus.APPROVED],
    [ApplicationStatus.PENDING, ApplicationStatus.REJECTED],
    [ApplicationStatus.APPROVED, ApplicationStatus.DISBURSED],
  ])('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    [ApplicationStatus.PENDING, ApplicationStatus.DISBURSED],
    [ApplicationStatus.REJECTED, ApplicationStatus.APPROVED],
    [ApplicationStatus.REJECTED, ApplicationStatus.DISBURSED],
    [ApplicationStatus.DISBURSED, ApplicationStatus.APPROVED],
    [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
  ])('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

