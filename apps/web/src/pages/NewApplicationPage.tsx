import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Message } from '../components/Feedback';
import { BirthDatePicker } from '../components/BirthDatePicker';
import { PageHeader } from '../components/PageHeader';
import { api, getErrorCode } from '../lib/api';
import { createApplicationSchema, getEstimatePreview } from '../lib/applicationForm';
import { formatDateInput, parseDateInput } from '../lib/dateInput';
import { formatMoney } from '../lib/format';
import type { LoanApplication } from '../types/api';

export function NewApplicationPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [birthDateText, setBirthDateText] = useState('');
  const schema = useMemo(() => createApplicationSchema(t), [t]);
  type FormValues = typeof schema._output;

  const { register, handleSubmit, setValue, trigger, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });
  const previousLanguage = useRef(i18n.language);
  useEffect(() => {
    if (previousLanguage.current === i18n.language) return;
    previousLanguage.current = i18n.language;
    const invalidFields = Object.keys(errors) as Array<keyof FormValues>;
    if (invalidFields.length) void trigger(invalidFields);
  }, [errors, i18n.language, trigger]);
  const previousDateLanguage = useRef(i18n.language);
  useEffect(() => {
    if (previousDateLanguage.current === i18n.language) return;
    const oldLanguage = previousDateLanguage.current;
    previousDateLanguage.current = i18n.language;
    setBirthDateText((current) => {
      const iso = parseDateInput(current, oldLanguage);
      return iso ? formatDateInput(iso, i18n.language) : current;
    });
  }, [i18n.language]);
  const [amount, rate, installments, frequency] = watch([
    'requestedAmount', 'annualInterestRate', 'installmentCount', 'paymentFrequency',
  ]);
  const { hasAmount, hasRate, hasInstallments, hasFrequency, estimatedPayment } = getEstimatePreview(amount, rate, installments, frequency);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.post<LoanApplication>('/loan-applications', values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      navigate('/applications', { replace: true, state: { notice: 'created' } });
    },
    onError: (error) => setErrorCode(getErrorCode(error)),
  });

  const fieldError = (name: string, message?: string) => message ? <small className="field-error" id={`${name}-error`}>{message}</small> : null;
  const describedBy = (name: string, message?: string) => message ? `${name}-error` : undefined;

  return (
    <>
      <PageHeader eyebrow={t('form.eyebrow')} title={t('form.title')} description={t('form.description')} />
      <form className="application-layout" onSubmit={handleSubmit((values) => mutation.mutate(values))} onChange={() => { if (errorCode) setErrorCode(null); }} onWheelCapture={(event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.type === 'number' && target === document.activeElement) {
          target.blur();
        }
      }} noValidate>
        <div className="form-sections">
          <section className="form-section">
            <div className="section-heading"><span>01</span><h2>{t('form.personal')}</h2></div>
            <div className="field-grid">
              <label className="field span-2">{t('form.fullName')}<input autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={describedBy('full-name', errors.fullName?.message)} {...register('fullName')} />{fieldError('full-name', errors.fullName?.message)}</label>
              <label className="field">{t('form.identification')}<input className="mono" autoComplete="off" spellCheck={false} aria-invalid={Boolean(errors.identification)} aria-describedby={describedBy('identification', errors.identification?.message)} {...register('identification')} />{fieldError('identification', errors.identification?.message)}</label>
              <div className="field">
                <label htmlFor="birth-date-input">{t('form.birthDate')}</label>
                <BirthDatePicker text={birthDateText} language={i18n.language} invalid={Boolean(errors.birthDate)} describedBy={errors.birthDate ? 'birth-date-hint birth-date-error' : 'birth-date-hint'} onTextChange={(next) => {
                  setBirthDateText(next);
                  setValue('birthDate', parseDateInput(next, i18n.language) ?? next, { shouldDirty: true, shouldValidate: Boolean(errors.birthDate) });
                }} onDateSelect={(iso) => {
                  setBirthDateText(formatDateInput(iso, i18n.language));
                  setValue('birthDate', iso, { shouldDirty: true, shouldValidate: true });
                }} onBlur={() => { void trigger('birthDate'); }} />
                <input type="hidden" {...register('birthDate')} />
                <small id="birth-date-hint">{t('form.dateFormatHint')}</small>{fieldError('birth-date', errors.birthDate?.message)}
              </div>
              <label className="field">{t('form.email')}<input type="email" autoComplete="email" spellCheck={false} aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email', errors.email?.message)} {...register('email')} />{fieldError('email', errors.email?.message)}</label>
              <label className="field">{t('form.phone')}<input type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy('phone', errors.phone?.message)} {...register('phone')} />{fieldError('phone', errors.phone?.message)}</label>
            </div>
          </section>
          <section className="form-section">
            <div className="section-heading"><span>02</span><h2>{t('form.employment')}</h2></div>
            <div className="field-grid">
              <label className="field">{t('form.employmentType')}<select aria-invalid={Boolean(errors.employmentType)} aria-describedby={describedBy('employment-type', errors.employmentType?.message)} {...register('employmentType')}><option value="">{t('form.selectOption')}</option><option value="SALARIED">{t('form.salaried')}</option><option value="SELF_EMPLOYED">{t('form.selfEmployed')}</option></select>{fieldError('employment-type', errors.employmentType?.message)}</label>
              <label className="field">{t('form.workplace')}<input autoComplete="organization" aria-invalid={Boolean(errors.workplace)} aria-describedby={describedBy('workplace', errors.workplace?.message)} {...register('workplace')} />{fieldError('workplace', errors.workplace?.message)}</label>
              <label className="field">{t('form.employmentYears')}<input type="number" inputMode="numeric" min="0" max="70" autoComplete="off" aria-invalid={Boolean(errors.employmentYears)} aria-describedby={describedBy('employment-years', errors.employmentYears?.message)} {...register('employmentYears', { valueAsNumber: true })} />{fieldError('employment-years', errors.employmentYears?.message)}</label>
              <label className="field">{t('form.monthlyIncome')}<input type="number" inputMode="decimal" min="0.01" step="0.01" autoComplete="off" aria-invalid={Boolean(errors.monthlyIncome)} aria-describedby={describedBy('monthly-income', errors.monthlyIncome?.message)} {...register('monthlyIncome', { valueAsNumber: true })} />{fieldError('monthly-income', errors.monthlyIncome?.message)}</label>
            </div>
          </section>
          <section className="form-section credit-terms">
            <div className="section-heading"><span>03</span><h2>{t('form.credit')}</h2></div>
            <div className="field-grid">
              <label className="field">{t('form.requestedAmount')}<input type="number" inputMode="decimal" min="0.01" step="0.01" autoComplete="off" aria-invalid={Boolean(errors.requestedAmount)} aria-describedby={describedBy('requested-amount', errors.requestedAmount?.message)} {...register('requestedAmount', { valueAsNumber: true })} />{fieldError('requested-amount', errors.requestedAmount?.message)}</label>
              <label className="field">{t('form.annualRate')}<input type="number" inputMode="decimal" min="0" max="100" step="0.01" autoComplete="off" aria-invalid={Boolean(errors.annualInterestRate)} aria-describedby={describedBy('annual-rate', errors.annualInterestRate?.message)} {...register('annualInterestRate', { valueAsNumber: true })} />{fieldError('annual-rate', errors.annualInterestRate?.message)}</label>
              <label className="field">{t('form.installmentCount')}<input type="number" inputMode="numeric" min="1" max="600" autoComplete="off" aria-invalid={Boolean(errors.installmentCount)} aria-describedby={describedBy('installment-count', errors.installmentCount?.message)} {...register('installmentCount', { valueAsNumber: true })} />{fieldError('installment-count', errors.installmentCount?.message)}</label>
              <label className="field">{t('form.frequency')}<select aria-invalid={Boolean(errors.paymentFrequency)} aria-describedby={describedBy('payment-frequency', errors.paymentFrequency?.message)} {...register('paymentFrequency')}><option value="">{t('form.selectOption')}</option><option value="BIWEEKLY">{t('form.biweekly')}</option><option value="MONTHLY">{t('form.monthly')}</option><option value="ANNUAL">{t('form.annual')}</option></select>{fieldError('payment-frequency', errors.paymentFrequency?.message)}</label>
            </div>
          </section>
        </div>
        <aside className="credit-summary">
          <div className="summary-head"><div className="summary-icon" aria-hidden="true"><Calculator /></div><p className="eyebrow">{t('form.summary')}</p></div>
          <div className="estimated-payment"><span>{t('form.estimatedPayment')}</span><strong>{estimatedPayment === null ? '—' : formatMoney(estimatedPayment, i18n.language)}</strong></div>
          <dl>
            <div><dt>{t('form.requestedAmount')}</dt><dd>{hasAmount ? formatMoney(amount, i18n.language) : '—'}</dd></div>
            <div><dt>{t('form.annualRate')}</dt><dd>{hasRate ? `${rate}%` : '—'}</dd></div>
            <div><dt>{t('form.frequency')}</dt><dd>{hasFrequency ? t(`frequency.${frequency}`) : '—'}</dd></div>
            <div><dt>{t('form.installmentCount')}</dt><dd>{hasInstallments ? installments : '—'}</dd></div>
          </dl>
        </aside>
        <div className="form-actions">
          {errorCode ? <Message kind="error">{t(`errors.${errorCode}`, { defaultValue: t('errors.UNKNOWN_ERROR') })}</Message> : null}
          <button className="button primary submit-button" type="submit" disabled={mutation.isPending}>
            <Save size={18} aria-hidden="true" /> {mutation.isPending ? t('form.submitting') : t('form.submit')}
          </button>
        </div>
      </form>
    </>
  );
}
