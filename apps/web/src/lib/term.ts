import type { TFunction } from 'i18next';
import type { RiskCase } from '../types/api';

export function formatTerm(term: RiskCase['term'], t: TFunction): string {
  return term.months % 12 === 0
    ? t('term.years', { count: term.years })
    : t('term.months', { count: term.months });
}
