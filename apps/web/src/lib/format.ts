export function formatMoney(value: number, language: string): string {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-NI', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-NI', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

