import { useTranslation } from 'react-i18next';
import bacLogo from '../assets/brands/bac.svg';
import banproLogo from '../assets/brands/banpro.webp';
import ficohsaLogo from '../assets/brands/ficohsa.svg';
import lafiseLogo from '../assets/brands/lafise.svg';
import type { Bank } from '../types/api';

const banks: Array<{ value: Bank; label: string; logo: string; className: string }> = [
  { value: 'LAFISE', label: 'LAFISE', logo: lafiseLogo, className: 'lafise' },
  { value: 'FICOHSA', label: 'FICOHSA', logo: ficohsaLogo, className: 'ficohsa' },
  { value: 'BAC_CREDOMATIC', label: 'BAC Credomatic', logo: bacLogo, className: 'bac' },
  { value: 'BANPRO', label: 'Banpro', logo: banproLogo, className: 'banpro' },
];

interface BankSelectorProps {
  value: Bank;
  onChange: (value: Bank) => void;
  disabled?: boolean;
}

export function BankSelector({ value, onChange, disabled = false }: BankSelectorProps) {
  const { t } = useTranslation();

  return (
    <fieldset className="bank-selector" disabled={disabled}>
      <legend>{t('disbursement.bank')}</legend>
      <p>{t('disbursement.bankHelp')}</p>
      <div className="bank-options">
        {banks.map((bank) => (
          <label className={`bank-option ${value === bank.value ? 'selected' : ''}`} key={bank.value}>
            <input
              type="radio"
              name="destination-bank"
              value={bank.value}
              checked={value === bank.value}
              onChange={() => onChange(bank.value)}
            />
            <span className={`bank-logo ${bank.className}`} aria-hidden="true">
              <img src={bank.logo} alt="" width="92" height="32" />
            </span>
            <span translate="no">{bank.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
