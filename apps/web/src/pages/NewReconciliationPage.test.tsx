import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/render';
import { INITIAL_FORM, validateForm } from '@/features/reconciliations/form';
import { NewReconciliationPage } from './NewReconciliationPage';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const render = () => renderPage(<NewReconciliationPage />, { path: '/' });

describe('validateForm', () => {
  const valid = {
    ...INITIAL_FORM,
    name: 'Agosto',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
  };

  it('no reporta errores con datos válidos y los defaults', () => {
    expect(validateForm(valid)).toEqual({});
  });

  it('acepta un período de un solo día', () => {
    expect(validateForm({ ...valid, periodStart: '2026-08-10', periodEnd: '2026-08-10' })).toEqual(
      {},
    );
  });

  it('rechaza fin anterior a inicio', () => {
    expect(
      validateForm({ ...valid, periodStart: '2026-08-31', periodEnd: '2026-08-01' }).periodEnd,
    ).toMatch(/anterior/);
  });

  it('rechaza parámetros fuera de rango', () => {
    const errors = validateForm({
      ...valid,
      dateWindowDays: '-1',
      amountTolerance: '-0.1',
      feePercent: '101',
      withholdingPercent: 'abc',
    });
    expect(Object.keys(errors).sort()).toEqual([
      'amountTolerance',
      'dateWindowDays',
      'feePercent',
      'withholdingPercent',
    ]);
  });
});

describe('Paso 1 del asistente', () => {
  it('arranca con los parámetros por defecto', () => {
    render();
    expect(screen.getByLabelText('Ventana de días')).toHaveValue('3');
    expect(screen.getByLabelText('Tolerancia de monto')).toHaveValue('0.05');
    expect(screen.getByLabelText('% comisión')).toHaveValue('0');
    expect(screen.getByLabelText('% retención')).toHaveValue('0');
    expect(screen.getByLabelText('Habilitar cruce agrupado')).toBeChecked();
  });

  it('muestra errores de validación y no llama a la API', async () => {
    render();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Crear conciliación' }));
    expect(await screen.findByText('Escribe un nombre')).toBeInTheDocument();
    expect(screen.getByText('Indica la fecha de inicio')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('valida que el fin no sea anterior al inicio', async () => {
    render();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nombre'), 'Agosto');
    await user.type(screen.getByLabelText('Inicio del período'), '2026-08-31');
    await user.type(screen.getByLabelText('Fin del período'), '2026-08-01');
    await user.click(screen.getByRole('button', { name: 'Crear conciliación' }));
    expect(await screen.findByText(/no puede ser anterior/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('crea la conciliación con los parámetros y navega al detalle', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'abc-1' }), { status: 201 }));
    render();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nombre'), '  Diners agosto ');
    await user.type(screen.getByLabelText('Inicio del período'), '2026-08-01');
    await user.type(screen.getByLabelText('Fin del período'), '2026-08-31');
    await user.click(screen.getByLabelText('Habilitar cruce agrupado'));
    await user.click(screen.getByRole('button', { name: 'Crear conciliación' }));

    expect(
      await screen.findByRole('heading', { name: 'Detalle de conciliación' }),
    ).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/reconciliations');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Diners agosto',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      config: {
        dateWindowDays: 3,
        amountTolerance: 0.05,
        feePercent: 0,
        withholdingPercent: 0,
        enableGrouping: false,
      },
    });
  });

  it('muestra el error del servidor', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'periodEnd no puede ser anterior a periodStart' }), {
        status: 400,
      }),
    );
    render();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nombre'), 'Agosto');
    await user.type(screen.getByLabelText('Inicio del período'), '2026-08-01');
    await user.type(screen.getByLabelText('Fin del período'), '2026-08-31');
    await user.click(screen.getByRole('button', { name: 'Crear conciliación' }));
    await waitFor(() =>
      expect(screen.getByText('periodEnd no puede ser anterior a periodStart')).toBeInTheDocument(),
    );
  });
});
