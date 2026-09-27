// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import i18n from '../i18n';
import { api } from '../lib/api';
import { NewApplicationPage } from './NewApplicationPage';

vi.mock('../lib/api', () => ({
  api: { post: vi.fn() },
  getErrorCode: vi.fn(() => 'UNKNOWN_ERROR'),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><LanguageSwitcher /><NewApplicationPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  cleanup();
  vi.clearAllMocks();
  await i18n.changeLanguage('es');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('new application date picker', () => {
  it('selects a distant birth date by year and month, localizes its display, and submits ISO', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}) as never);
    const { container } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    expect(screen.getByRole('dialog', { name: 'Elegir fecha de nacimiento' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Año' }), { target: { value: '1990' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Mes' }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /15 de junio de 1990/i }));

    const birthDate = screen.getByRole('textbox', { name: 'Fecha de nacimiento' }) as HTMLInputElement;
    expect(birthDate.value).toBe('15/06/1990');
    expect((container.querySelector('[name="birthDate"]') as HTMLInputElement).value).toBe('1990-06-15');
    expect(screen.queryByRole('dialog', { name: 'Elegir fecha de nacimiento' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    await waitFor(() => expect(birthDate.value).toBe('06/15/1990'));
    expect(birthDate.placeholder).toBe('MM/dd/yyyy');
    expect((container.querySelector('[name="birthDate"]') as HTMLInputElement).value).toBe('1990-06-15');

    const values = {
      fullName: 'Cliente QA', identification: 'QA-CALENDAR-001', email: 'qa@test.com',
      phone: '88887766', employmentType: 'SALARIED', workplace: 'Empresa QA',
      employmentYears: '5', monthlyIncome: '2000', requestedAmount: '12000',
      installmentCount: '24', annualInterestRate: '12', paymentFrequency: 'MONTHLY',
    };
    for (const [name, value] of Object.entries(values)) {
      const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
      if (!input) throw new Error(`Missing ${name}`);
      fireEvent.change(input, { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save application' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/loan-applications', expect.objectContaining({
      birthDate: '1990-06-15',
    })));
  });

  it('allows the date exactly 80 years ago, including the lower boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'));
    const { container } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Año' }), { target: { value: '1946' } });
    const boundary = screen.getByRole('button', { name: /27 de septiembre de 1946/i }) as HTMLButtonElement;
    expect(boundary.disabled).toBe(false);
    fireEvent.click(boundary);
    expect((screen.getByRole('textbox', { name: 'Fecha de nacimiento' }) as HTMLInputElement).value).toBe('27/09/1946');
    expect((container.querySelector('[name="birthDate"]') as HTMLInputElement).value).toBe('1946-09-27');
  });

  it('disables dates before the 80-year boundary and prevents navigating to earlier months', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'));
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Año' }), { target: { value: '1946' } });
    expect((screen.getByRole('button', { name: /26 de septiembre de 1946/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /27 de septiembre de 1946/i }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Mes anterior' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('combobox', { name: 'Mes' }).querySelector('option[value="7"]') as HTMLOptionElement).disabled).toBe(true);
    expect(screen.getByRole('combobox', { name: 'Año' }).querySelector('option[value="1945"]')).toBeNull();
  });

  it('disables future days and closes with Escape while returning focus to the trigger', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'));
    renderForm();
    const birthDate = screen.getByRole('textbox', { name: 'Fecha de nacimiento' });
    fireEvent.keyDown(birthDate, { key: 'ArrowDown', altKey: true });
    expect(screen.getByRole('dialog', { name: 'Elegir fecha de nacimiento' })).toBeTruthy();
    expect((screen.getByRole('button', { name: /28 de septiembre de 2026/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Mes siguiente' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Elegir fecha de nacimiento' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir calendario' }));
  });
});
