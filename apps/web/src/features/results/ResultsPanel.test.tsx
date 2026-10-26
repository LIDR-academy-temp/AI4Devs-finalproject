import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/render';
import { ResultsPanel } from './ResultsPanel';
import { bank, json, match, page, pos, summary } from './testData';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const urls = () => fetchMock.mock.calls.map(([url]) => String(url));

function route(
  opts: {
    summary?: ReturnType<typeof summary>;
    matches?: unknown[];
    mutate?: () => Promise<Response>;
  } = {},
) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === 'DELETE' || init?.method === 'PATCH')
      return opts.mutate?.() ?? json(null, 204);
    if (u.includes('/summary')) return json(opts.summary ?? summary());
    if (u.includes('/matches')) return json(page(opts.matches ?? [match('m1')]));
    if (u.includes('pos-transactions')) return json(page([pos('p1', '10.00')]));
    return json(page([bank('b1', '10.00')]));
  });
}

const show = (props: { readOnly?: boolean; tolerance?: number } = {}) =>
  renderPage(
    <ResultsPanel
      reconciliationId="r1"
      version="v"
      readOnly={props.readOnly ?? false}
      tolerance={props.tolerance ?? 0.05}
    />,
  );

describe('ResultsPanel · indicadores y pestañas', () => {
  it('muestra los KPI de la última ejecución', async () => {
    route();
    show();
    expect(await screen.findByText('74,7 %')).toBeInTheDocument();
    expect(screen.getByText('1205')).toBeInTheDocument();
    expect(screen.getByText('-15,25')).toBeInTheDocument();
  });

  it('sin ejecución los indicadores de cruce salen en cero', async () => {
    route({
      summary: summary({
        matchedByMethod: {},
        matchedPos: 0,
        matchedBank: 0,
        matchedPercent: 0,
        proposed: 0,
        exceptions: 0,
        totalDifference: '0.00',
        pendingPos: 1205,
      }),
    });
    show();
    expect(await screen.findByText('0 %')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Conciliadas \(0\)/ })).toBeInTheDocument();
  });

  it('las pestañas muestran su contador', async () => {
    route();
    show();
    expect(await screen.findByRole('tab', { name: 'Conciliadas (900)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pendientes POS (305)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pendientes banco (74)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Propuestas (3)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Excepciones (1)' })).toBeInTheDocument();
  });

  it('al cambiar a Pendientes banco consulta solo movimientos PENDING', async () => {
    route();
    show();
    await userEvent.click(await screen.findByRole('tab', { name: /Pendientes banco/ }));
    await screen.findByRole('table', { name: 'Movimientos bancarios' });
    expect(urls().some((u) => u.includes('bank-movements') && u.includes('status=PENDING'))).toBe(
      true,
    );
    expect(urls().some((u) => u.includes('pos-transactions'))).toBe(false);
  });

  it('los filtros de monto se envían al servidor y reinician la página', async () => {
    route();
    show();
    await userEvent.click(await screen.findByRole('tab', { name: /Pendientes POS/ }));
    await userEvent.type(await screen.findByLabelText('Monto mínimo'), '100');
    await userEvent.type(screen.getByLabelText('Monto máximo'), '200');
    await waitFor(() =>
      expect(urls().some((u) => u.includes('amountMin=100') && u.includes('amountMax=200'))).toBe(
        true,
      ),
    );
  });

  it('el filtro por método se aplica en Conciliadas', async () => {
    route();
    show();
    await screen.findByRole('table', { name: 'Cruces conciliados' });
    await userEvent.selectOptions(screen.getByLabelText('Método'), 'TOLERANCE');
    await waitFor(() => expect(urls().some((u) => u.includes('method=TOLERANCE'))).toBe(true));
  });

  it('el detalle de una venta muestra la fila original', async () => {
    route();
    show();
    await userEvent.click(await screen.findByRole('tab', { name: /Pendientes POS/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }));
    expect(await screen.findByText(/Fila 1 del archivo original/)).toBeInTheDocument();
    expect(screen.getByText('01/09/2026')).toBeInTheDocument();
  });

  it('el detalle de un cruce manual muestra quién lo creó y la nota', async () => {
    route({
      matches: [
        match('m1', {
          method: 'MANUAL',
          createdBy: 'Ana Analista',
          confirmedBy: 'Ana Analista',
          explanation: 'Depósito del lote 0452',
        }),
      ],
    });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }));
    expect(await screen.findAllByText(/Ana Analista/)).not.toHaveLength(0);
    expect(screen.getByText('Depósito del lote 0452')).toBeInTheDocument();
  });

  it('en una conciliación cerrada no hay cruce manual ni acciones', async () => {
    route();
    show({ readOnly: true });
    await screen.findByRole('table', { name: 'Cruces conciliados' });
    expect(screen.queryByRole('tab', { name: 'Cruce manual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });
});

describe('ResultsPanel · deshacer y propuestas', () => {
  it('Deshacer pide confirmación y luego llama a DELETE', async () => {
    route();
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'DELETE')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Sí, deshacer' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, i]) => i?.method === 'DELETE');
      expect(String(call?.[0])).toContain('/matches/m1');
    });
  });

  it('cancelar la confirmación no deshace nada', async () => {
    route();
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));
    await userEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'DELETE')).toBe(false);
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
  });

  it('Propuestas: Confirmar y Rechazar envían PATCH con la acción', async () => {
    route({ matches: [match('m2', { status: 'PROPOSED', method: 'TOLERANCE' })] });
    show();
    await userEvent.click(await screen.findByRole('tab', { name: /Propuestas/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH');
      expect(JSON.parse(call![1].body)).toMatchObject({ action: 'CONFIRM' });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([, i]) => i?.method === 'PATCH');
      expect(JSON.parse(calls.at(-1)![1].body)).toMatchObject({ action: 'REJECT' });
    });
  });

  it('confirmar una propuesta con diferencia sobre la tolerancia exige nota', async () => {
    route({ matches: [match('m3', { status: 'PROPOSED', difference: '5.00' })] });
    show();
    await userEvent.click(await screen.findByRole('tab', { name: /Propuestas/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    const confirm = within(screen.getByRole('table', { name: 'Cruces propuestos' })).getByRole(
      'button',
      {
        name: 'Confirmar',
      },
    );
    expect(confirm).toBeDisabled();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false);
    await userEvent.type(screen.getByLabelText('Nota de confirmación'), 'Comisión');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH');
      expect(JSON.parse(call![1].body)).toEqual({ action: 'CONFIRM', note: 'Comisión' });
    });
  });

  it('muestra el error del servidor al fallar la acción', async () => {
    route({
      mutate: () => json({ message: 'La conciliación está cerrada y no admite cambios' }, 400),
    });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, deshacer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cerrada/);
  });
});
