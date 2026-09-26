import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Eye, RefreshCw, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState, Message } from '../components/Feedback';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { api, getErrorCode } from '../lib/api';
import { formatMoney } from '../lib/format';
import { formatTerm } from '../lib/term';
import type { RiskCase } from '../types/api';

export function RiskCommitteePage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const selectedId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [observations, setObservations] = useState('');
  const [observationsError, setObservationsError] = useState(false);
  const approveButtonRef = useRef<HTMLButtonElement>(null);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const list = useQuery({
    queryKey: ['risk-pending'],
    queryFn: () => api.get<RiskCase[]>('/risk-committee/pending').then((response) => response.data),
  });
  const detail = useQuery({
    queryKey: ['risk-case', selectedId],
    queryFn: () => api.get<RiskCase>(`/risk-committee/${selectedId}`).then((response) => response.data),
    enabled: selectedId !== null,
  });
  const complete = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['risk-pending'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
      queryClient.invalidateQueries({ queryKey: ['approved-credits'] }),
    ]);
  };
  const approve = useMutation({
    mutationFn: () => api.post<{ creditNumber: string; installmentCount: number }>(
      `/risk-committee/${selectedId}/approve`, { observations },
    ).then((response) => response.data),
    onSuccess: async (data) => {
      await complete();
      setDialog(null);
      setMessage({ kind: 'success', text: t('risk.approved', { creditNumber: data.creditNumber, count: data.installmentCount }) });
      setTimeout(() => navigate('/risk-committee'), 800);
    },
    onError: (error) => {
      setDialog(null);
      setMessage({ kind: 'error', text: t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN_ERROR') }) });
    },
  });
  const reject = useMutation({
    mutationFn: () => api.post(`/risk-committee/${selectedId}/reject`, { observations }),
    onSuccess: async () => {
      await complete();
      setDialog(null);
      setMessage({ kind: 'success', text: t('risk.rejected') });
      setTimeout(() => navigate('/risk-committee'), 800);
    },
    onError: (error) => {
      setDialog(null);
      setMessage({ kind: 'error', text: t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN_ERROR') }) });
    },
  });

  if (selectedId !== null) {
    if (detail.isPending || list.isPending) return <LoadingState label={t('common.loading')} />;
    if (detail.isError || !detail.data) return <EmptyState title={t('errors.APPLICATION_NOT_FOUND')} action={<Link className="button secondary" to="/risk-committee">{t('risk.backToList')}</Link>} />;
    if (list.data && !list.data.some((item) => item.id === selectedId)) {
      return <EmptyState title={t('errors.APPLICATION_ALREADY_PROCESSED')} action={<Link className="button secondary" to="/risk-committee">{t('risk.backToList')}</Link>} />;
    }
    const item = detail.data;
    const isWorking = approve.isPending || reject.isPending;
    const handleApprove = () => {
      if (!observations.trim()) {
        setObservationsError(true);
        return;
      }
      setObservationsError(false);
      setMessage(null);
      setDialog('approve');
    };
    const handleReject = () => setDialog('reject');
    return (
      <>
        <PageHeader
          eyebrow={t('risk.eyebrow')}
          title={t('risk.caseTitle')}
          description={t('risk.readonly')}
          action={<Link className="button ghost" to="/risk-committee"><ArrowLeft size={17} aria-hidden="true" />{t('common.cancel')}</Link>}
        />
        <section className="risk-case-card">
          <div className="dossier-overview">
            <div className="dossier-identity">
              <span>{t('applications.customer')}</span>
              <h2>{item.fullName}</h2>
              <p className="mono" translate="no">{item.identification}</p>
            </div>
          <dl className="risk-facts">
            <div><dt>{t('risk.age')}</dt><dd>{t('risk.years', { count: item.age })}</dd></div>
            <div><dt>{t('risk.installments')}</dt><dd>{item.installmentCount}</dd></div>
            <div><dt>{t('applications.frequency')}</dt><dd>{t(`frequency.${item.paymentFrequency}`)}</dd></div>
            <div><dt>{t('risk.term')}</dt><dd>{formatTerm(item.term, t)}</dd></div>
            <div className="risk-amount"><dt>{t('applications.amount')}</dt><dd className="mono">{formatMoney(item.requestedAmount, i18n.language)}</dd></div>
          </dl>
          </div>
          <div className="decision-block">
            <label className="field">{t('risk.observations')}
              <textarea rows={5} value={observations} onChange={(event) => {
                setObservations(event.target.value);
                if (event.target.value.trim()) setObservationsError(false);
                if (message?.kind === 'error') setMessage(null);
              }} maxLength={1000} aria-invalid={observationsError} aria-describedby={observationsError ? 'observations-error' : undefined} />
              <small>{t('risk.observationsHelp')}</small>
              {observationsError ? <small className="field-error" id="observations-error">{t('errors.OBSERVATIONS_REQUIRED')}</small> : null}
            </label>
            {message ? <Message kind={message.kind}>{message.text}</Message> : null}
            <div className="decision-actions">
              <button className="button danger-button" type="button" ref={rejectButtonRef} disabled={isWorking} onClick={handleReject}><X size={18} aria-hidden="true" />{reject.isPending ? t('risk.rejecting') : t('risk.reject')}</button>
              <button className="button primary" type="button" ref={approveButtonRef} disabled={isWorking} onClick={handleApprove}><Check size={18} aria-hidden="true" />{approve.isPending ? t('risk.approving') : t('risk.approve')}</button>
            </div>
          </div>
        </section>
        <ConfirmDialog
          open={dialog !== null}
          title={dialog === 'reject' ? t('risk.rejectDialogTitle') : t('risk.approveDialogTitle')}
          description={dialog === 'reject' ? t('risk.rejectConfirm') : t('risk.approveConfirm')}
          confirmLabel={dialog === 'reject' ? t('risk.reject') : t('risk.approve')}
          cancelLabel={t('common.cancel')}
          tone={dialog === 'reject' ? 'danger' : 'primary'}
          pending={isWorking}
          returnFocusRef={dialog === 'reject' ? rejectButtonRef : approveButtonRef}
          onCancel={() => setDialog(null)}
          onConfirm={() => dialog === 'reject' ? reject.mutate() : approve.mutate()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={t('risk.eyebrow')} title={t('risk.title')} description={t('risk.description')} />
      {list.isPending ? <LoadingState label={t('common.loading')} /> : null}
      {list.isError ? <Message kind="error">{t('risk.loadError')} <button className="inline-action" type="button" onClick={() => void list.refetch()}><RefreshCw size={14} aria-hidden="true" />{t('common.retry')}</button></Message> : null}
      {list.data?.length === 0 ? <EmptyState title={t('risk.empty')} description={t('risk.emptyDescription')} /> : null}
      {list.data?.length ? <div className="table-panel"><div className="table-scroll"><table>
        <thead><tr><th>{t('applications.identification')}</th><th>{t('applications.customer')}</th><th>{t('risk.age')}</th><th>{t('risk.installments')}</th><th>{t('applications.frequency')}</th><th>{t('risk.term')}</th><th>{t('applications.amount')}</th><th>{t('common.actions')}</th></tr></thead>
        <tbody>{list.data.map((item) => <tr key={item.id}>
          <td className="mono" data-label={t('applications.identification')}>{item.identification}</td><td data-label={t('applications.customer')}><strong>{item.fullName}</strong></td>
          <td data-label={t('risk.age')}>{item.age}</td><td data-label={t('risk.installments')}>{item.installmentCount}</td><td data-label={t('applications.frequency')}>{t(`frequency.${item.paymentFrequency}`)}</td>
          <td data-label={t('risk.term')}>{formatTerm(item.term, t)}</td><td className="mono" data-label={t('applications.amount')}>{formatMoney(item.requestedAmount, i18n.language)}</td>
          <td data-label={t('common.actions')}><Link className="table-action" to={`/risk-committee/${item.id}`}><Eye size={16} aria-hidden="true" />{t('risk.open')}</Link></td>
        </tr>)}</tbody>
      </table></div></div> : null}
    </>
  );
}
