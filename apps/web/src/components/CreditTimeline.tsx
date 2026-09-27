import { Check, Circle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../lib/format';
import type { Bank, OperationalHistory } from '../types/api';

const bankNames: Record<Bank, string> = {
  LAFISE: 'LAFISE',
  FICOHSA: 'FICOHSA',
  BAC_CREDOMATIC: 'BAC Credomatic',
  BANPRO: 'Banpro',
};

export function CreditTimeline({ history }: { history: OperationalHistory }) {
  const { t, i18n } = useTranslation();
  const steps: Array<{ key: string; label: string; complete: boolean; details: ReactNode }> = [
    {
      key: 'application', label: t('timeline.application'), complete: true,
      details: <>
        <span>{t('timeline.registered')} · <time dateTime={history.application.registeredAt}>{formatDateTime(history.application.registeredAt, i18n.language)}</time></span>
        <span>{t('timeline.by')} <strong translate="no">{history.application.createdBy}</strong></span>
      </>,
    },
    ...(history.review ? [{
      key: 'committee', label: t('timeline.committee'), complete: true,
      details: <>
        <span>{t('timeline.approved')} · <time dateTime={history.review.reviewedAt}>{formatDateTime(history.review.reviewedAt, i18n.language)}</time></span>
        {history.review.reviewedBy ? <span>{t('timeline.by')} <strong translate="no">{history.review.reviewedBy}</strong></span> : null}
      </>,
    }] : []),
    {
      key: 'credit', label: t('timeline.credit'), complete: true,
      details: <>
        <span className="mono" translate="no">{history.credit.creditNumber}</span>
        <time dateTime={history.credit.createdAt}>{formatDateTime(history.credit.createdAt, i18n.language)}</time>
      </>,
    },
    {
      key: 'disbursement', label: t('timeline.disbursement'), complete: history.disbursement !== null,
      details: history.disbursement ? <>
        <span>{t('timeline.processed')} · <time dateTime={history.disbursement.processedAt}>{formatDateTime(history.disbursement.processedAt, i18n.language)}</time></span>
        <span>{t('timeline.by')} <strong translate="no">{history.disbursement.processedBy}</strong></span>
        <span>{t('timeline.bank')} <strong translate="no">{bankNames[history.disbursement.bank]}</strong></span>
        <span>{t('timeline.account')} <strong className="mono" translate="no">{history.disbursement.maskedAccountNumber}</strong></span>
      </> : t('timeline.pending'),
    },
  ];

  return (
    <section className="credit-timeline" aria-label={t('timeline.title')}>
      <div className="timeline-heading">
        <span>{t('timeline.title')}</span>
        <strong className="mono" translate="no">{history.credit.creditNumber}</strong>
      </div>
      <ol>
        {steps.map((step) => (
          <li className={step.complete ? 'complete' : 'pending'} key={step.key}>
            <span className="timeline-marker" aria-hidden="true">
              {step.complete ? <Check /> : <Circle />}
            </span>
            <div><strong>{step.label}</strong><small>{step.details}</small></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
