export function parseDateInput(value: string, language = 'es'): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const english = language.startsWith('en');
  const day = Number(match[english ? 2 : 1]);
  const month = Number(match[english ? 1 : 2]);
  const year = Number(match[3]);
  if (year < 1000) return null;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDateInput(isoDate: string, language = 'es'): string {
  const [year, month, day] = isoDate.split('-');
  return language.startsWith('en') ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}
