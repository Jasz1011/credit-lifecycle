import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Banknote, CircleCheckBig, Clock3, FileX2, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState, Message } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { formatMoney } from '../lib/format';
import type { RiskCase } from '../types/api';

interface Summary { pending: number; approved: number; rejected: number; disbursed: number }

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<Summary>('/dashboard/summary').then((response) => response.data),
  });
  const pending = useQuery({
    queryKey: ['risk-pending'],
    queryFn: () => api.get<RiskCase[]>('/risk-committee/pending').then((response) => response.data),
  });
  if (summary.isPending) return <LoadingState label={t('common.loading')} />;
  if (summary.isError || !summary.data) {
    return <Message kind="error">{t('dashboard.loadError')} <button className="inline-action" type="button" onClick={() => void summary.refetch()}>{t('common.retry')}</button></Message>;
  }

  const metrics = [
    { key: 'pending', value: summary.data.pending, icon: Clock3 },
    { key: 'approved', value: summary.data.approved, icon: CircleCheckBig },
    { key: 'rejected', value: summary.data.rejected, icon: FileX2 },
    { key: 'disbursed', value: summary.data.disbursed, icon: Banknote },
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        action={<Link className="button primary" to="/applications/new"><Plus size={17} aria-hidden="true" />{t('applications.new')}</Link>}
      />
      <section className="metric-grid">
        {metrics.map(({ key, value, icon: Icon }) => (
          <article className={`metric-card metric-${key}`} key={key}>
            <Icon aria-hidden="true" />
            <strong>{value}</strong>
            <span>{t(`dashboard.${key}`)}</span>
          </article>
        ))}
      </section>
      <section className="operational-section">
        <div className="section-toolbar">
          <div><h2>{t('dashboard.pendingSection')}</h2><p>{t('dashboard.pendingDescription')}</p></div>
          <Link className="text-link" to="/risk-committee">{t('dashboard.reviewAll')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {pending.isPending ? <LoadingState label={t('common.loading')} /> : null}
        {pending.isError ? (
          <Message kind="error">{t('dashboard.pendingError')} <button className="inline-action" type="button" onClick={() => void pending.refetch()}><RefreshCw size={14} aria-hidden="true" />{t('common.retry')}</button></Message>
        ) : null}
        {pending.data?.length === 0 ? <EmptyState title={t('dashboard.noPending')} description={t('dashboard.noPendingDescription')} /> : null}
        {pending.data?.length ? (
          <div className="table-panel"><div className="table-scroll"><table>
            <thead><tr><th>{t('applications.identification')}</th><th>{t('applications.customer')}</th><th>{t('applications.amount')}</th><th>{t('applications.frequency')}</th><th>{t('common.actions')}</th></tr></thead>
            <tbody>{pending.data.slice(0, 6).map((item) => (
              <tr key={item.id}>
                <td className="mono" data-label={t('applications.identification')}>{item.identification}</td>
                <td data-label={t('applications.customer')}><strong>{item.fullName}</strong></td>
                <td className="mono" data-label={t('applications.amount')}>{formatMoney(item.requestedAmount, i18n.language)}</td>
                <td data-label={t('applications.frequency')}>{t(`frequency.${item.paymentFrequency}`)}</td>
                <td data-label={t('common.actions')}><Link className="table-action" to={`/risk-committee/${item.id}`}>{t('risk.open')}<ArrowRight size={15} aria-hidden="true" /></Link></td>
              </tr>
            ))}</tbody>
          </table></div></div>
        ) : null}
      </section>
    </>
  );
}
