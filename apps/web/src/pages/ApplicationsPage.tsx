import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState, Message } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import type { LoanApplication } from '../types/api';

export function ApplicationsPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get<LoanApplication[]>('/loan-applications').then((response) => response.data),
  });
  const normalizedSearch = search.trim().toLocaleLowerCase(i18n.language);
  const applications = useMemo(() => query.data?.filter((application) => {
    if (!normalizedSearch) return true;
    return `${application.identification} ${application.fullName}`.toLocaleLowerCase(i18n.language).includes(normalizedSearch);
  }) ?? [], [i18n.language, normalizedSearch, query.data]);
  const notice = (location.state as { notice?: string } | null)?.notice;

  return (
    <>
      <PageHeader
        eyebrow={t('applications.eyebrow')}
        title={t('applications.title')}
        description={t('applications.description')}
        action={<Link className="button primary" to="/applications/new"><Plus size={17} aria-hidden="true" />{t('applications.new')}</Link>}
      />
      {notice === 'created' ? <Message kind="success">{t('applications.createdSuccess')}</Message> : null}
      {query.isPending ? <LoadingState label={t('common.loading')} /> : null}
      {query.isError ? <Message kind="error">{t('applications.loadError')} <button className="inline-action" type="button" onClick={() => void query.refetch()}><RefreshCw size={14} aria-hidden="true" />{t('common.retry')}</button></Message> : null}
      {query.data?.length === 0 ? <EmptyState title={t('applications.empty')} description={t('applications.emptyDescription')} action={<Link className="button secondary" to="/applications/new">{t('applications.new')}</Link>} /> : null}
      {query.data?.length ? (
        <>
        <div className="list-toolbar">
          <div className="compact-search"><Search aria-hidden="true" /><label className="sr-only" htmlFor="application-search">{t('applications.search')}</label><input id="application-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('applications.searchPlaceholder')} autoComplete="off" /></div>
          <span>{t('applications.resultCount', { count: applications.length })}</span>
        </div>
        {applications.length === 0 ? <EmptyState title={t('applications.noMatches')} description={t('applications.noMatchesDescription')} /> : (
        <div className="table-panel"><div className="table-scroll"><table>
          <thead><tr>
            <th>{t('applications.identification')}</th><th>{t('applications.customer')}</th>
            <th>{t('applications.amount')}</th><th>{t('applications.frequency')}</th>
            <th>{t('applications.status')}</th><th>{t('applications.created')}</th>
          </tr></thead>
          <tbody>{applications.map((application) => (
            <tr key={application.id}>
              <td className="mono" data-label={t('applications.identification')}>{application.identification}</td>
              <td data-label={t('applications.customer')}><strong>{application.fullName}</strong></td>
              <td className="mono" data-label={t('applications.amount')}>{formatMoney(application.requestedAmount, i18n.language)}</td>
              <td data-label={t('applications.frequency')}>{t(`frequency.${application.paymentFrequency}`)}</td>
              <td data-label={t('applications.status')}><StatusBadge status={application.status} /></td>
              <td data-label={t('applications.created')}>{formatDate(application.createdAt, i18n.language)}</td>
            </tr>
          ))}</tbody>
        </table></div></div>)}
        </>
      ) : null}
    </>
  );
}
