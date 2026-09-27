import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAuth } from '../auth/auth-context';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import mcSystemsLogo from '../assets/brands/mcsystems.png';

interface LoginValues { identifier: string; password: string }

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [serverError, setServerError] = useState(false);
  const schema = z.object({
    identifier: z.string().min(1, t('validation.required')),
    password: z.string().min(8, t('validation.required')),
  });
  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });
  const previousLanguage = useRef(i18n.language);
  useEffect(() => {
    if (previousLanguage.current === i18n.language) return;
    previousLanguage.current = i18n.language;
    const invalidFields = Object.keys(errors) as Array<keyof LoginValues>;
    if (invalidFields.length) void trigger(invalidFields);
  }, [errors, i18n.language, trigger]);

  const onSubmit = async (values: LoginValues) => {
    setServerError(false);
    try {
      await login(values.identifier, values.password);
    } catch {
      setServerError(true);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="institution-brand">
          <img src={mcSystemsLogo} alt="MCSystems" width="512" height="512" fetchPriority="high" />
          <span>{t('login.assessment')}</span>
        </div>
        <div className="login-copy">
          <p className="eyebrow">{t('login.eyebrow')}</p>
          <h1 translate="no">CreditFlow</h1>
          <h2>{t('login.title')}</h2>
          <p>{t('login.description')}</p>
          <p className="login-process">{t('login.process')}</p>
        </div>
        <p className="login-disclaimer">{t('login.disclaimer')}</p>
      </section>
      <section className="login-form-panel">
        <div className="login-language"><LanguageSwitcher /></div>
        <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="login-form-heading"><ShieldCheck aria-hidden="true" /><div><p>{t('login.accessLabel')}</p><h2>{t('login.action')}</h2></div></div>
          <label htmlFor="login-identifier">{t('login.identifier')}</label>
          <input id="login-identifier" autoComplete="username" spellCheck={false} aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? 'login-identifier-error' : undefined} {...register('identifier', { onChange: () => setServerError(false) })} />
          {errors.identifier ? <small className="field-error" id="login-identifier-error">{errors.identifier.message}</small> : null}
          <label htmlFor="login-password">{t('login.password')}</label>
          <input id="login-password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} {...register('password', { onChange: () => setServerError(false) })} />
          {errors.password ? <small className="field-error" id="login-password-error">{errors.password.message}</small> : null}
          {serverError ? <p className="form-error" role="alert">{t('login.error')}</p> : null}
          <button className="button primary wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('login.working') : t('login.action')} <ArrowRight size={18} aria-hidden="true" />
          </button>
          <details className="evaluation-credentials">
            <summary>{t('login.credentialsPrompt')}</summary>
            <div>
              <span>{t('login.user')} <code translate="no">analista</code></span>
              <span>{t('login.password')} <code translate="no">Credito2026!</code></span>
            </div>
          </details>
        </form>
      </section>
    </main>
  );
}
