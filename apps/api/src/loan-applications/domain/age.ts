export function calculateAge(birthDate: Date, asOf = new Date()): number {
  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    asOf.getUTCMonth() < birthDate.getUTCMonth() ||
    (asOf.getUTCMonth() === birthDate.getUTCMonth() &&
      asOf.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function isEligibleByAge(birthDate: Date, asOf = new Date()): boolean {
  const age = calculateAge(birthDate, asOf);
  return age >= 0 && age <= 80;
}
