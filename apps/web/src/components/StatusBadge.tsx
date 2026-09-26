import { useTranslation } from 'react-i18next';
import type { ApplicationStatus } from '../types/api';

export function StatusBadge({ status }: { status: ApplicationStatus | 'PAID' }) {
  const { t } = useTranslation();
  return <span className={`status-badge status-${status.toLowerCase()}`}>{t(`status.${status}`)}</span>;
}

