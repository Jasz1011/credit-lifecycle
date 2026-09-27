import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CreditTimeline } from '../components/CreditTimeline';
import { EmptyState, LoadingState, Message } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { api, getErrorCode } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import type { PaymentSchedule } from '../types/api';

export function PaymentSchedulePage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const identification = searchParams.get('identification')?.trim().toUpperCase() ?? '';
  const [input, setInput] = useState(identification);
  const matchesSearch = input.trim().toUpperCase() === identification;
  const schedule = useQuery({
    queryKey: ['payment-schedule-search', identification],
    queryFn: () => api.get<PaymentSchedule>('/credits/search', { params: { identification } }).then((response) => response.data),
    enabled: identification.length > 0,
    retry: false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = input.trim().toUpperCase();
    if (normalized) setSearchParams({ identification: normalized });
  };

  return (
    <>
      <PageHeader eyebrow={t('schedule.eyebrow')} title={t('schedule.title')} description={t('schedule.description')} />
      <form className="search-bar" onSubmit={submit}>
        <Search aria-hidden="true" />
        <input className="mono" value={input} onChange={(event) => setInput(event.target.value)} placeholder={t('schedule.placeholder')} aria-label={t('form.identification')} />
        <button className="button primary" type="submit" disabled={!input.trim()}>{t('common.search')}</button>
      </form>
      {!identification ? <EmptyState title={t('schedule.empty')} description={t('schedule.emptyDescription')} /> : null}
      {schedule.isPending && identification ? <LoadingState label={t('common.loading')} /> : null}
      {schedule.isError && matchesSearch ? <Message kind="error">{t(`errors.${getErrorCode(schedule.error)}`, { defaultValue: t('errors.UNKNOWN_ERROR') })} <button className="inline-action" type="button" onClick={() => void schedule.refetch()}><RefreshCw size={14} aria-hidden="true" />{t('common.retry')}</button></Message> : null}
      {schedule.data && matchesSearch ? <>
        <CreditTimeline history={schedule.data.history} />
        <section className="schedule-summary">
          <div><small>{t('schedule.credit')}</small><strong className="mono">{schedule.data.credit.creditNumber}</strong></div>
          <div><small>{t('applications.customer')}</small><strong>{schedule.data.credit.fullName}</strong></div>
          <div><small>{t('applications.amount')}</small><strong className="mono">{formatMoney(schedule.data.credit.requestedAmount, i18n.language)}</strong></div>
          <div><small>{t('schedule.payment')}</small><strong className="mono">{formatMoney(schedule.data.credit.levelPayment, i18n.language)}</strong></div>
          <div><small>{t('applications.status')}</small><StatusBadge status={schedule.data.credit.status} /></div>
        </section>
        <div className="table-panel"><div className="table-scroll"><table>
          <thead><tr><th>{t('schedule.number')}</th><th>{t('schedule.dueDate')}</th><th>{t('schedule.amount')}</th><th>{t('schedule.principal')}</th><th>{t('schedule.interest')}</th><th>{t('schedule.balance')}</th><th>{t('schedule.status')}</th></tr></thead>
          <tbody>{schedule.data.installments.map((installment) => <tr key={installment.id}>
            <td className="mono" data-label={t('schedule.number')}>{String(installment.installmentNumber).padStart(2, '0')}</td>
            <td data-label={t('schedule.dueDate')}>{formatDate(installment.dueDate, i18n.language)}</td>
            <td className="mono" data-label={t('schedule.amount')}>{formatMoney(installment.paymentAmount, i18n.language)}</td>
            <td className="mono" data-label={t('schedule.principal')}>{formatMoney(installment.principalAmount, i18n.language)}</td>
            <td className="mono" data-label={t('schedule.interest')}>{formatMoney(installment.interestAmount, i18n.language)}</td>
            <td className="mono" data-label={t('schedule.balance')}>{formatMoney(installment.remainingBalance, i18n.language)}</td>
            <td data-label={t('schedule.status')}><StatusBadge status={installment.status} /></td>
          </tr>)}</tbody>
        </table></div></div>
      </> : null}
    </>
  );
}
