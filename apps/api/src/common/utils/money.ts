export function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function percentToBasisPoints(percent: number): number {
  return Math.round((percent + Number.EPSILON) * 100);
}

export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

