import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/render';
import { ManualMatchView } from './ManualMatchView';
import { bank, json, page, pos } from './testData';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const route = (overrides: { post?: () => Promise<Response> } = {}) =>
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return overrides.post?.() ?? json({ id: 'm1' }, 201);
    if (String(url).includes('pos-transactions')) {
      return json(page([pos('p1', '100.00'), pos('p2', '100.00'), pos('p3', '112.40')]));
    }
    return json(page([bank('b1', '305.28')]));
  });

const show = () => renderPage(<ManualMatchView reconciliationId="r1" version="v" />);

const tick = async (name: string) => userEvent.click(await screen.findByLabelText(name));
const bar = () => within(screen.getByRole('status', { name: 'Diferencia' }));

describe('ManualMatchView', () => {
  it('suma cada lado y muestra la diferencia en vivo (312,40 vs 305,28 → −7,12)', async () => {
    route();
    show();
    await tick('Seleccionar fila p1');
    await tick('Seleccionar fila p2');
    await tick('Seleccionar fila p3');
    await tick('Seleccionar fila b1');
    expect(bar().getByText('312,40')).toBeInTheDocument();
    expect(bar().getByText('305,28')).toBeInTheDocument();
    expect(bar().getByText('-7,12')).toBeInTheDocument();
  });

  it('deshabilita crear el cruce si solo hay selección en un lado', async () => {
    route();
    show();
    const create = await screen.findByRole('button', { name: 'Crear cruce manual' });
    expect(create).toBeDisabled();
    await tick('Seleccionar fila p1');
    expect(create).toBeDisabled();
    await tick('Seleccionar fila b1');
    expect(create).toBeEnabled();
  });

  it('con diferencia ≠ 0 pide confirmación mostrando la diferencia y luego envía el cruce', async () => {
    route();
    show();
    await tick('Seleccionar fila p1');
    await tick('Seleccionar fila b1');
    await userEvent.type(screen.getByLabelText(/Nota/), 'Neto de comisión');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cruce manual' }));

    const dialog = screen.getByRole('dialog', { name: /diferencia/i });
    expect(dialog).toHaveTextContent('205,28');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear con diferencia' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true),
    );
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(String(url)).toContain('/reconciliations/r1/matches');
    expect(JSON.parse(init.body)).toEqual({
      posIds: ['p1'],
      bankIds: ['b1'],
      note: 'Neto de comisión',
    });
    // Tras crear se limpia la selección
    await waitFor(() => expect(bar().getByText('Diferencia:')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Crear cruce manual' })).toBeDisabled();
  });

  it('con diferencia 0 crea el cruce sin pedir confirmación', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return json({ id: 'm1' }, 201);
      return String(url).includes('pos-transactions')
        ? json(page([pos('p1', '100.00')]))
        : json(page([bank('b1', '100.00')]));
    });
    show();
    await tick('Seleccionar fila p1');
    await tick('Seleccionar fila b1');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cruce manual' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true),
    );
  });

  it('muestra el rechazo del servidor (transacción ocupada)', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return json({ message: 'Ya no están pendientes: venta POS de la fila 1' }, 409);
      }
      return String(url).includes('pos-transactions')
        ? json(page([pos('p1', '100.00')]))
        : json(page([bank('b1', '100.00')]));
    });
    show();
    await tick('Seleccionar fila p1');
    await tick('Seleccionar fila b1');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cruce manual' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Ya no están pendientes/);
  });

  it('limita la nota a 500 caracteres', async () => {
    route();
    show();
    expect(await screen.findByLabelText(/Nota/)).toHaveAttribute('maxlength', '500');
  });
});
