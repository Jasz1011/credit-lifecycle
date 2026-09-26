import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const language = i18n.language.startsWith('en') ? 'en' : 'es';

  return (
    <div className="language-switcher" aria-label={t('common.language')}>
      <Languages aria-hidden="true" size={16} />
      {(['es', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={language === option ? 'active' : ''}
          aria-pressed={language === option}
          onClick={() => void i18n.changeLanguage(option)}
        >
          {t(option === 'es' ? 'common.spanish' : 'common.english')}
        </button>
      ))}
    </div>
  );
}

