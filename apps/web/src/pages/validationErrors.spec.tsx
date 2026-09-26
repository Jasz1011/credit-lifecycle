// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { api, getErrorCode } from '../lib/api';
import { RiskCommitteePage } from './RiskCommitteePage';
import { DisbursementsPage } from './DisbursementsPage';
import { NewApplicationPage } from './NewApplicationPage';

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  getErrorCode: vi.fn(() => 'UNKNOWN_ERROR'),
}));

function renderWithQuery(element: React.ReactNode, route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/" element={element} />
          <Route path="/risk-committee/:id" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  // jsdom lacks the native modal methods used by the real browser.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

describe('validation errors clear after correction', () => {
  it('clears required observations before approval confirmation', async () => {
    const riskCase = {
      id: 7, identification: 'TEST-12345', fullName: 'Cliente', age: 35,
      installmentCount: 12, paymentFrequency: 'MONTHLY', term: { months: 12, years: 1 },
      requestedAmount: 12000,
    };
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url === '/risk-committee/pending' ? [riskCase] : riskCase,
    } as never));
    renderWithQuery(<RiskCommitteePage />, '/risk-committee/7');
    const approve = await screen.findByRole('button', { name: 'Aprobar crédito' });
    fireEvent.click(approve);
    expect(screen.getByText('Las observaciones son obligatorias para aprobar.')).toBeTruthy();
    const observations = screen.getByRole('textbox', { name: /Observaciones/ });
    expect(observations.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(observations, { target: { value: 'Revisión completada' } });
    await waitFor(() => expect(screen.queryByText('Las observaciones son obligatorias para aprobar.')).toBeNull());
    expect(observations.getAttribute('aria-invalid')).toBe('false');
  });

  it('does not offer approval on a processed risk detail URL', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url === '/risk-committee/pending' ? [] : {
        id: 7, identification: 'TEST-12345', fullName: 'Cliente', age: 35,
        installmentCount: 12, paymentFrequency: 'MONTHLY', term: { months: 12, years: 1 },
        requestedAmount: 12000,
      },
    } as never));
    renderWithQuery(<RiskCommitteePage />, '/risk-committee/7');
    expect(await screen.findByText('La solicitud ya fue procesada.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprobar crédito' })).toBeNull();
  });

  it('clears the invalid bank account error as soon as it becomes valid', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{
      id: 9, creditNumber: 'CR-000009', levelPayment: 1000, status: 'APPROVED',
      identification: 'TEST-12345', fullName: 'Cliente', requestedAmount: 12000,
      annualInterestRate: 12, installmentCount: 12, paymentFrequency: 'MONTHLY',
      term: { months: 12, years: 1 }, createdAt: '2026-09-25', disbursement: null,
    }] } as never);
    renderWithQuery(<DisbursementsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /TEST-12345/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Desembolsar crédito' }));
    expect(screen.getByText('Ingrese un número de cuenta o IBAN.')).toBeTruthy();
    const account = screen.getByRole('textbox', { name: 'Número de cuenta / IBAN' });
    expect(account.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(account, { target: { value: '100200300400' } });
    await waitFor(() => expect(screen.queryByText('Ingrese un número de cuenta o IBAN.')).toBeNull());
    expect(account.getAttribute('aria-invalid')).toBe('false');
    expect(account.getAttribute('aria-describedby')).toBe('account-help');
  });

  it('replaces a checksum error when a NI IBAN is corrected for the selected bank', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.get).mockResolvedValue({ data: [{
      id: 9, creditNumber: 'CR-000009', levelPayment: 1000, status: 'APPROVED',
      identification: 'TEST-12345', fullName: 'Cliente', requestedAmount: 12000,
      annualInterestRate: 12, installmentCount: 12, paymentFrequency: 'MONTHLY',
      term: { months: 12, years: 1 }, createdAt: '2026-09-25', disbursement: null,
    }] } as never);
    renderWithQuery(<DisbursementsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /TEST-12345/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Banpro' }));
    const account = screen.getByRole('textbox', { name: 'Número de cuenta / IBAN' });
    fireEvent.change(account, { target: { value: 'NI44BAPR00000013000003558124' } });
    fireEvent.click(screen.getByRole('button', { name: 'Desembolsar crédito' }));
    expect(screen.getByText('El código de verificación del IBAN no es válido.')).toBeTruthy();
    expect(account.getAttribute('aria-describedby')).toBe('account-help account-error');
    fireEvent.change(account, { target: { value: 'ni45 bapr 0000 0013 0000 0355 8124' } });
    await waitFor(() => expect(screen.queryByText('El código de verificación del IBAN no es válido.')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Desembolsar crédito' }));
    expect(await screen.findByText('••••••8124')).toBeTruthy();
    expect(account.getAttribute('aria-invalid')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desembolso' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/credits/9/disburse', {
      bank: 'BANPRO', accountNumber: 'NI45BAPR00000013000003558124',
    }));
  });

  it('shows a bank mismatch from the API and clears it when the bank is corrected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{
      id: 9, creditNumber: 'CR-000009', levelPayment: 1000, status: 'APPROVED',
      identification: 'TEST-12345', fullName: 'Cliente', requestedAmount: 12000,
      annualInterestRate: 12, installmentCount: 12, paymentFrequency: 'MONTHLY',
      term: { months: 12, years: 1 }, createdAt: '2026-09-25', disbursement: null,
    }] } as never);
    vi.mocked(api.post).mockRejectedValueOnce(new Error('API conflict')).mockResolvedValueOnce({ data: {} } as never);
    vi.mocked(getErrorCode).mockReturnValueOnce('BANK_IBAN_MISMATCH');
    renderWithQuery(<DisbursementsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /TEST-12345/ }));
    const account = screen.getByRole('textbox', { name: 'Número de cuenta / IBAN' });
    fireEvent.change(account, { target: { value: 'NI45BAPR00000013000003558124' } });
    fireEvent.click(screen.getByRole('button', { name: 'Desembolsar crédito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desembolso' }));
    expect(await screen.findByText('El IBAN ingresado no corresponde al banco seleccionado.')).toBeTruthy();
    expect(account.getAttribute('aria-invalid')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Banpro' }));
    expect(screen.queryByText('El IBAN ingresado no corresponde al banco seleccionado.')).toBeNull();
    expect(account.getAttribute('aria-invalid')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Desembolsar crédito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desembolso' }));
    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith('/credits/9/disburse', {
      bank: 'BANPRO', accountNumber: 'NI45BAPR00000013000003558124',
    }));
  });

  it('clears a bank mismatch when the IBAN is corrected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{
      id: 9, creditNumber: 'CR-000009', levelPayment: 1000, status: 'APPROVED',
      identification: 'TEST-12345', fullName: 'Cliente', requestedAmount: 12000,
      annualInterestRate: 12, installmentCount: 12, paymentFrequency: 'MONTHLY',
      term: { months: 12, years: 1 }, createdAt: '2026-09-25', disbursement: null,
    }] } as never);
    vi.mocked(api.post).mockRejectedValueOnce(new Error('API conflict'));
    vi.mocked(getErrorCode).mockReturnValueOnce('BANK_IBAN_MISMATCH');
    renderWithQuery(<DisbursementsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /TEST-12345/ }));
    const account = screen.getByRole('textbox', { name: 'Número de cuenta / IBAN' });
    fireEvent.change(account, { target: { value: 'NI45BAPR00000013000003558124' } });
    fireEvent.click(screen.getByRole('button', { name: 'Desembolsar crédito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desembolso' }));
    expect(await screen.findByText('El IBAN ingresado no corresponde al banco seleccionado.')).toBeTruthy();
    fireEvent.change(account, { target: { value: '100200300400' } });
    expect(screen.queryByText('El IBAN ingresado no corresponde al banco seleccionado.')).toBeNull();
    expect(account.getAttribute('aria-invalid')).toBe('false');
  });

  it('submits the localized date as an ISO value to the existing API', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}) as never);
    const { container } = renderWithQuery(<NewApplicationPage />);
    const values = {
      fullName: 'Cliente QA', identification: 'QA-DATE-001', email: 'qa@test.com',
      phone: '88887766', employmentType: 'SALARIED', workplace: 'Empresa QA',
      employmentYears: '5', monthlyIncome: '2000', requestedAmount: '12000',
      installmentCount: '24', annualInterestRate: '12', paymentFrequency: 'MONTHLY',
    };
    for (const [name, value] of Object.entries(values)) {
      const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
      if (!input) throw new Error(`Missing ${name}`);
      fireEvent.change(input, { target: { value } });
    }
    fireEvent.change(screen.getByRole('textbox', { name: 'Fecha de nacimiento' }), { target: { value: '15/06/1990' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar solicitud' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/loan-applications', expect.objectContaining({
      birthDate: '1990-06-15',
      installmentCount: 24,
      annualInterestRate: 12,
    })));
  });
});
