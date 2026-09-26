import { Check, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/format';
import type { Credit } from '../types/api';

export function CreditTimeline({ credit }: { credit: Credit }) {
  const { t, i18n } = useTranslation();
  const disbursed = credit.status === 'DISBURSED' && credit.disbursement;
  const steps = [
    { label: t('timeline.application'), value: t('timeline.registered'), complete: true },
    { label: t('timeline.committee'), value: t('timeline.approved'), complete: true },
    {
      label: t('timeline.credit'),
      value: `${credit.creditNumber} · ${formatDate(credit.createdAt, i18n.language)}`,
      complete: true,
    },
    {
      label: t('timeline.disbursement'),
      value: disbursed
        ? `${t('timeline.processed')} · ${formatDate(disbursed.processedAt, i18n.language)}`
        : t('timeline.pending'),
      complete: Boolean(disbursed),
    },
  ];

  return (
    <section className="credit-timeline" aria-label={t('timeline.title')}>
      <div className="timeline-heading">
        <span>{t('timeline.title')}</span>
        <strong className="mono" translate="no">{credit.creditNumber}</strong>
      </div>
      <ol>
        {steps.map((step) => (
          <li className={step.complete ? 'complete' : 'pending'} key={step.label}>
            <span className="timeline-marker" aria-hidden="true">
              {step.complete ? <Check /> : <Circle />}
            </span>
            <div><strong>{step.label}</strong><small>{step.value}</small></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
