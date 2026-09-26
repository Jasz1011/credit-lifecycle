import { ApplicationStatus } from '@prisma/client';

const validTransitions: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  PENDING: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
  APPROVED: [ApplicationStatus.DISBURSED],
  REJECTED: [],
  DISBURSED: [],
};

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return validTransitions[from].includes(to);
}

