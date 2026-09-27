// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { CreditTimeline } from '../components/CreditTimeline';
import { api } from '../lib/api';
import type { OperationalHistory, PaymentSchedule } from '../types/api';
import { DisbursementsPage } from './DisbursementsPage';
import { PaymentSchedulePage } from './PaymentSchedulePage';

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  getErrorCode: vi.fn(() => 'UNKNOWN_ERROR'),
}));

const history: OperationalHistory = {
  application: { registeredAt: '2026-09-26T14:32:00.000Z', createdBy: 'Creadora real' },
  review: { reviewedAt: '2026-09-26T14:38:00.000Z', reviewedBy: 'Revisor real', result: 'APPROVED' },
  credit: { createdAt: '2026-09-26T14:39:00.000Z', creditNumber: 'CR-000003' },
  disbursement: null,
};

const schedule: PaymentSchedule = {
  credit: {
    id: 3, creditNumber: 'CR-000003', levelPayment: 1000, status: 'APPROVED',
    identification: 'HISTORY-001', fullName: 'Cliente QA', requestedAmount: 1000,
    annualInterestRate: 0, installmentCount: 1, paymentFrequency: 'MONTHLY',
    term: { months: 1, years: 1 / 12 }, createdAt: '2026-09-26T14:39:00.000Z', disbursement: null,
  },
  installments: [{
    id: 9, installmentNumber: 1, dueDate: '2026-10-26T14:39:00.000Z',
    paymentAmount: 1000, principalAmount: 1000, interestAmount: 0,
    remainingBalance: 0, status: 'PENDING',
  }],
  history,
};

function renderPage(element: React.ReactNode, route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  cleanup();
  vi.clearAllMocks();
  await i18n.changeLanguage('es');
});

describe('operational history', () => {
  it('shows only persisted events and a pending disbursement for an approved credit', () => {
    const { container } = render(<CreditTimeline history={history} />);
    expect(screen.getByText('Historial operativo')).toBeTruthy();
    expect(screen.getByText('Creadora real')).toBeTruthy();
    expect(screen.getByText('Revisor real')).toBeTruthy();
    expect(screen.getAllByText('CR-000003')).toHaveLength(2);
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(container.querySelectorAll('li.complete')).toHaveLength(3);
    expect(container.querySelectorAll('li.pending')).toHaveLength(1);
    expect(container.querySelector('time[datetime="2026-09-26T14:32:00.000Z"]')).not.toBeNull();
    expect(container.querySelector('time[datetime="2026-09-26T14:38:00.000Z"]')).not.toBeNull();
  });

  it('shows the real processor, date, official bank name and only a masked account', () => {
    const completed: OperationalHistory = {
      ...history,
      disbursement: {
        processedAt: '2026-09-26T14:51:00.000Z', processedBy: 'Procesadora real',
        bank: 'FICOHSA', maskedAccountNumber: '••••0400',
      },
    };
    const { container } = render(<CreditTimeline history={completed} />);
    expect(screen.getByText('Procesadora real')).toBeTruthy();
    expect(screen.getByText('FICOHSA')).toBeTruthy();
    expect(screen.getByText('••••0400')).toBeTruthy();
    expect(container.querySelector('time[datetime="2026-09-26T14:51:00.000Z"]')).not.toBeNull();
    expect(container.textContent).not.toContain('100200300400');
    expect(container.querySelectorAll('li.complete')).toHaveLength(4);
  });

  it('localizes the new labels in English without translating names or banks', async () => {
    render(<CreditTimeline history={{ ...history, disbursement: {
      processedAt: '2026-09-26T14:51:00.000Z', processedBy: 'Procesadora real',
      bank: 'BAC_CREDOMATIC', maskedAccountNumber: '••••0400',
    } }} />);
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText('Operational history')).toBeTruthy();
    expect(screen.getAllByText('By:')).toHaveLength(3);
    expect(screen.getByText('Bank:')).toBeTruthy();
    expect(screen.getByText('Account:')).toBeTruthy();
    expect(screen.getByText('BAC Credomatic')).toBeTruthy();
    expect(screen.getByText('Creadora real')).toBeTruthy();
  });

  it('keeps identification search and the payment schedule table working', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: schedule } as never);
    renderPage(<PaymentSchedulePage />, '/payment-schedule?identification=HISTORY-001');
    expect(await screen.findByText('Creadora real')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Cédula / Identificación' }).getAttribute('value')).toBe('HISTORY-001');
    expect(screen.getByText('Principal')).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/credits/search', { params: { identification: 'HISTORY-001' } });
  });

  it('does not add audit details to the restricted Disbursements screen', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{
      ...schedule.credit,
      email: 'private@example.com', phone: '88887766', createdBy: 'Creadora real',
      reviewedBy: 'Revisor real', processedBy: 'Procesadora real',
      birthDate: '1990-01-01', monthlyIncome: 2000,
    }] } as never);
    const { container } = renderPage(<DisbursementsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /HISTORY-001/ }));
    expect(screen.getAllByText('Cliente QA')).toHaveLength(2);
    for (const forbidden of [
      'private@example.com', '88887766', 'Creadora real', 'Revisor real',
      'Procesadora real', '1990-01-01', '2000', 'CR-000003',
    ]) {
      expect(container.textContent).not.toContain(forbidden);
    }
  });
});
