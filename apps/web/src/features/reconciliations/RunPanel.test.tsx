import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/render';
import { RunPanel, validateRunParams } from './RunPanel';
import type { ReconciliationDetail } from './api';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const file = (sourceType: 'POS' | 'BANK') => ({
  id: sourceType,
  sourceType,
  originalName: `${sourceType}.xlsx`,
  status: 'IMPORTED',
  totalRows: 1,
  validRows: 1,
  errorRows: 0,
});

const base: ReconciliationDetail = {
  id: 'r1',
  name: 'Agosto',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  status: 'DRAFT',
  matchedPercent: null,
  createdAt: '2026-08-01',
  config: {
    dateWindowDays: 3,
    amountTolerance: 0.05,
    feePercent: 2,
    withholdingPercent: 1,
    enableGrouping: true,
  },
  stats: null,
  completedAt: null,
  files: [file('POS'), file('BANK')],
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const show = (over: Partial<ReconciliationDetail> = {}) =>
  renderPage(<RunPanel reconciliation={{ ...base, ...over }} />);

describe('validateRunParams', () => {
  const ok = {
    dateWindowDays: '3',
    amountTolerance: '0.05',
    feePercent: '2',
    withholdingPercent: '1',
  };
  it('acepta valores válidos', () => expect(validateRunParams(ok)).toBeNull());
  it('rechaza negativos, vacíos y ventana no entera', () => {
    expect(validateRunParams({ ...ok, feePercent: '-1' })).toMatch(/% comisión/);
    expect(validateRunParams({ ...ok, amountTolerance: '' })).toMatch(/Tolerancia/);
    expect(validateRunParams({ ...ok, dateWindowDays: '1.5' })).toMatch(/entero/);
    expect(validateRunParams({ ...ok, feePercent: '101' })).toMatch(/100/);
  });
});

describe('RunPanel', () => {
  it('deshabilita ejecutar e indica qué falta si no hay extracto bancario', () => {
    show({ files: [file('POS')] });
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
    expect(screen.getByText(/Falta importar: extracto bancario/)).toBeInTheDocument();
  });

  it('abre el diálogo con los parámetros actuales y envía los valores editados', async () => {
    fetchMock.mockImplementation(() => json({ id: 'r1', status: 'PROCESSING' }, 202));
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    const window = screen.getByLabelText('Ventana de días');
    expect(window).toHaveValue(3);
    await userEvent.clear(window);
    await userEvent.type(window, '5');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar ejecución' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/reconciliations/r1/run');
    expect(JSON.parse(init.body)).toEqual({
      dateWindowDays: 5,
      amountTolerance: 0.05,
      feePercent: 2,
      withholdingPercent: 1,
    });
  });

  it('no envía si un parámetro es inválido', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    const tolerance = screen.getByLabelText('Tolerancia de monto');
    await userEvent.clear(tolerance);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar ejecución' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Tolerancia/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra el indicador de progreso en PROCESSING y bloquea el botón', () => {
    show({ status: 'PROCESSING' });
    expect(screen.getByRole('status')).toHaveTextContent(/Procesando/);
    expect(screen.getByRole('button', { name: 'Volver a ejecutar' })).toBeDisabled();
  });

  it('muestra el motivo del fallo en FAILED', () => {
    show({ status: 'FAILED', stats: { error: 'Ejecución interrumpida' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Ejecución interrumpida');
  });

  it('resume los resultados y los locales sin relación en COMPLETED', () => {
    show({
      status: 'COMPLETED',
      stats: {
        matchedPercent: 28.8,
        matchedByMethod: { EXACT: 4171 },
        proposed: 292,
        pendingPos: 10,
        pendingBank: 5,
        unmappedStores: ['ALM. EXTERNOS 02'],
      },
    });
    expect(screen.getByText(/28.8 %/)).toBeInTheDocument();
    expect(screen.getByText(/EXACT 4171/)).toBeInTheDocument();
    expect(screen.getByText(/ALM. EXTERNOS 02/)).toBeInTheDocument();
  });

  it('muestra el error del servidor al rechazar la ejecución', async () => {
    fetchMock.mockImplementation(() => json({ message: 'Ya hay una ejecución en curso' }, 409));
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar ejecución' }));
    expect(await screen.findByText(/Ya hay una ejecución en curso/)).toBeInTheDocument();
  });
});
