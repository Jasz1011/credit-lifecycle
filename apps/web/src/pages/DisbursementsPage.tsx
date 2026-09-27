import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState, Message } from '../components/Feedback';
import { BankSelector } from '../components/BankSelector';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { api, getErrorCode } from '../lib/api';
import { validateBankAccountInput, type AccountErrorCode } from '../lib/bankAccount';
import { formatMoney } from '../lib/format';
import { formatTerm } from '../lib/term';
import type { Bank, Credit } from '../types/api';

const bankNames: Record<Bank, string> = {
  LAFISE: 'LAFISE',
  FICOHSA: 'FICOHSA',
  BAC_CREDOMATIC: 'BAC Credomatic',
  BANPRO: 'Banpro',
};

export function DisbursementsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Credit | null>(null);
  const [bank, setBank] = useState<Bank>('LAFISE');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountErrorCode, setAccountErrorCode] = useState<AccountErrorCode | null>(null);
  const [confirmedAccountNumber, setConfirmedAccountNumber] = useState('');
  const processButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' } | { kind: 'error'; code: string } | null>(null);
  const credits = useQuery({
    queryKey: ['approved-credits'],
    queryFn: () => api.get<Credit[]>('/credits/approved').then((response) => response.data),
  });
  const mutation = useMutation({
    mutationFn: () => api.post(`/credits/${selected?.id}/disburse`, { bank, accountNumber: confirmedAccountNumber }),
    onSuccess: async () => {
      setConfirmOpen(false);
      setMessage({ kind: 'success' });
      setSelected(null);
      setAccountNumber('');
      setConfirmedAccountNumber('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['approved-credits'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['applications'] }),
      ]);
    },
    onError: (error) => {
      setConfirmOpen(false);
      const code = getErrorCode(error);
      if (code === 'BANK_IBAN_MISMATCH') {
        setAccountErrorCode(code);
        setMessage(null);
      } else {
        setMessage({ kind: 'error', code });
      }
    },
  });
  const process = () => {
    const validation = validateBankAccountInput(accountNumber);
    if (!validation.valid) {
      setAccountErrorCode(validation.errorCode);
      return;
    }
    setAccountErrorCode(null);
    setConfirmedAccountNumber(validation.normalizedValue);
    setMessage(null);
    setConfirmOpen(true);
  };
  const maskedAccount = confirmedAccountNumber.length > 4 ? `••••••${confirmedAccountNumber.slice(-4)}` : confirmedAccountNumber;

  return (
    <>
      <PageHeader eyebrow={t('disbursement.eyebrow')} title={t('disbursement.title')} description={t('disbursement.description')} />
      {message ? <Message kind={message.kind}>{message.kind === 'error'
        ? t(`errors.${message.code}`, { defaultValue: t('errors.UNKNOWN_ERROR') })
        : t('disbursement.success')}</Message> : null}
      {credits.isPending ? <LoadingState label={t('common.loading')} /> : null}
      {credits.isError ? <Message kind="error">{t('disbursement.loadError')} <button className="inline-action" type="button" onClick={() => void credits.refetch()}><RefreshCw size={14} aria-hidden="true" />{t('common.retry')}</button></Message> : null}
      {credits.data?.length === 0 ? <EmptyState title={t('disbursement.empty')} description={t('disbursement.emptyDescription')} /> : null}
      {credits.data?.length ? <div className="disbursement-grid">
        <section className="credit-list">
          {credits.data.map((credit) => (
            <button type="button" className={`credit-option ${selected?.id === credit.id ? 'selected' : ''}`} key={credit.id} onClick={() => { setSelected(credit); setMessage(null); setAccountErrorCode(null); setAccountNumber(''); setConfirmedAccountNumber(''); }}>
              <span><small>{t('applications.identification')}</small><strong className="mono">{credit.identification}</strong><em>{credit.fullName}</em></span>
              <b className="mono">{formatMoney(credit.requestedAmount, i18n.language)}</b>
            </button>
          ))}
        </section>
        <section className="disbursement-panel">
          {selected ? <>
            <div className="panel-heading"><div><p className="eyebrow">{t('disbursement.select')}</p><h2>{t('disbursement.transferTitle')}</h2></div></div>
            <dl className="compact-details">
              <div><dt>{t('applications.identification')}</dt><dd className="mono">{selected.identification}</dd></div>
              <div><dt>{t('applications.customer')}</dt><dd>{selected.fullName}</dd></div>
              <div><dt>{t('applications.amount')}</dt><dd className="mono">{formatMoney(selected.requestedAmount, i18n.language)}</dd></div>
              <div><dt>{t('disbursement.rate')}</dt><dd>{selected.annualInterestRate}%</dd></div>
              <div><dt>{t('applications.frequency')}</dt><dd>{t(`frequency.${selected.paymentFrequency}`)}</dd></div>
              <div><dt>{t('risk.term')}</dt><dd>{formatTerm(selected.term, t)}</dd></div>
            </dl>
            <BankSelector value={bank} onChange={(value) => {
              setBank(value);
              if (accountErrorCode === 'BANK_IBAN_MISMATCH') setAccountErrorCode(null);
              if (message?.kind === 'error') setMessage(null);
            }} disabled={mutation.isPending} />
            <label className="field" htmlFor="account-number">{t('disbursement.account')}</label>
            <input id="account-number" className="account-input mono" value={accountNumber} onChange={(event) => {
              setAccountNumber(event.target.value);
              setConfirmedAccountNumber('');
              if (accountErrorCode) {
                const next = validateBankAccountInput(event.target.value);
                setAccountErrorCode(next.valid ? null : next.errorCode);
              }
              if (message?.kind === 'error') setMessage(null);
            }} aria-invalid={Boolean(accountErrorCode)} aria-describedby={accountErrorCode ? 'account-help account-error' : 'account-help'} maxLength={64} inputMode="text" autoComplete="off" spellCheck={false} placeholder={t('disbursement.accountPlaceholder')} />
            <small className="account-help" id="account-help">{t('disbursement.accountHelp')}</small>
            {accountErrorCode ? <small className="field-error" id="account-error">{t(`errors.${accountErrorCode}`)}</small> : null}
            <button type="button" className="button primary wide" ref={processButtonRef} disabled={mutation.isPending} onClick={process}><Landmark size={18} aria-hidden="true" />{mutation.isPending ? t('disbursement.processing') : t('disbursement.process')}</button>
          </> : <EmptyState title={t('disbursement.select')} description={t('disbursement.selectDescription')} />}
        </section>
        <ConfirmDialog
          open={confirmOpen}
          title={t('disbursement.confirmTitle')}
          description={t('disbursement.confirm')}
          confirmLabel={t('disbursement.confirmAction')}
          cancelLabel={t('common.cancel')}
          pending={mutation.isPending}
          returnFocusRef={processButtonRef}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => mutation.mutate()}
          details={selected ? <dl className="confirmation-summary">
            <div><dt>{t('applications.amount')}</dt><dd className="mono">{formatMoney(selected.requestedAmount, i18n.language)}</dd></div>
            <div><dt>{t('disbursement.bank')}</dt><dd translate="no">{bankNames[bank]}</dd></div>
            <div><dt>{t('disbursement.account')}</dt><dd className="mono">{maskedAccount}</dd></div>
          </dl> : null}
        />
      </div> : null}
    </>
  );
}
