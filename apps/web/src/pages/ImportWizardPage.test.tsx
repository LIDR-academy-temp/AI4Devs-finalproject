import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/render';
import { ImportWizardPage } from './ImportWizardPage';

const PREVIEW = {
  fileId: 'f1',
  sourceType: 'POS',
  headerRow: 1,
  fields: [
    { field: 'transactionAt', label: 'Fecha', required: true },
    { field: 'amount', label: 'Monto', required: true },
    { field: 'reference', label: 'Referencia', required: false },
  ],
  headers: ['FECHA', 'VALOR', 'REF'],
  rows: [{ rowNumber: 2, cells: ['05/03/2026', '10,50', 'R1'] }],
  totalRows: 1,
  sheetName: 'Detalle',
  sheetCount: 2,
};

const RESULT = {
  fileId: 'f1',
  status: 'IMPORTED',
  totalRows: 1000,
  validRows: 985,
  errorRows: 15,
  discardedDebits: 3,
  errors: [{ row: 2, field: 'transactionAt', reason: 'Fecha inválida' }],
};

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && url.endsWith('/files'))
      return json(201, { id: 'f1', sourceType: 'POS' });
    if (url.includes('/preview')) return json(200, PREVIEW);
    if (url.endsWith('/import')) return json(200, RESULT);
    if (url.endsWith('/files/f1')) return json(200, { id: 'f1', errors: RESULT.errors });
    return json(404, {});
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderWizard = (source = 'pos') =>
  renderPage(<ImportWizardPage />, {
    path: '/reconciliations/:id/import/:source',
    initial: `/reconciliations/r1/import/${source}`,
  });

async function uploadFile(name = 'ventas.xlsx') {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText('Archivo'), new File(['x'], name));
  return user;
}

describe('Asistente de importación', () => {
  it('muestra el paso 2 para POS y el paso 3 para el banco', () => {
    renderWizard('pos');
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument();
  });

  it('rechaza localmente un formato no admitido sin llamar a la API', async () => {
    renderWizard();
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByLabelText('Archivo'), new File(['x'], 'ventas.pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent('.csv o .xlsx');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor, p. ej. un duplicado', async () => {
    fetchMock.mockImplementation(() =>
      json(409, { message: 'Este archivo ya fue cargado en la conciliación como "ventas.xlsx"' }),
    );
    renderWizard();
    await uploadFile();
    expect(await screen.findByRole('alert')).toHaveTextContent('ya fue cargado');
  });

  it('tras subir muestra la vista previa y deshabilita Importar hasta asignar fecha y monto', async () => {
    renderWizard();
    const user = await uploadFile();
    expect(await screen.findByText('FECHA')).toBeInTheDocument();
    expect(screen.getByText(/tiene 2 hojas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Falta asignar: Fecha, Monto');

    await user.selectOptions(screen.getByLabelText('Campo para la columna FECHA'), 'transactionAt');
    expect(screen.getByRole('alert')).toHaveTextContent('Falta asignar: Monto');
    await user.selectOptions(screen.getByLabelText('Campo para la columna VALOR'), 'amount');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importar' })).toBeEnabled();
  });

  it('avisa cuando un campo se asigna a dos columnas y bloquea la importación', async () => {
    renderWizard();
    const user = await uploadFile();
    await screen.findByText('FECHA');
    await user.selectOptions(screen.getByLabelText('Campo para la columna FECHA'), 'transactionAt');
    await user.selectOptions(screen.getByLabelText('Campo para la columna VALOR'), 'amount');
    await user.selectOptions(screen.getByLabelText('Campo para la columna REF'), 'amount');
    expect(screen.getByText(/«Monto» está asignado a más de una columna/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled();
  });

  it('muestra la primera fecha interpretada según el formato elegido', async () => {
    renderWizard();
    const user = await uploadFile();
    await screen.findByText('FECHA');
    await user.selectOptions(screen.getByLabelText('Campo para la columna FECHA'), 'transactionAt');
    expect(screen.getByText(/05\/03\/2026 → 2026-03-05/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Formato de fecha'), 'MM/dd/yyyy');
    expect(screen.getByText(/05\/03\/2026 → 2026-05-03/)).toBeInTheDocument();
  });

  it('importa con el mapeo elegido y muestra el resumen con errores y descarga de CSV', async () => {
    renderWizard();
    const user = await uploadFile();
    await screen.findByText('FECHA');
    await user.selectOptions(screen.getByLabelText('Campo para la columna FECHA'), 'transactionAt');
    await user.selectOptions(screen.getByLabelText('Campo para la columna VALOR'), 'amount');
    await user.selectOptions(screen.getByLabelText('Separador decimal'), '.');
    await user.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByText('Importación completada.')).toBeInTheDocument();
    expect(screen.getByText('985')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Débitos descartados')).toBeInTheDocument();
    expect(screen.getByText('Fecha inválida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar errores (CSV)' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar con el extracto bancario' }),
    ).toBeInTheDocument();

    const importCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/import'));
    expect(JSON.parse(importCall?.[1].body)).toEqual({
      columnMapping: { 0: 'transactionAt', 1: 'amount' },
      dateFormat: 'dd/MM/yyyy',
      decimalSeparator: '.',
      headerRow: 1,
    });
  });

  it('cambiar la fila de cabeceras recarga la vista previa con ese valor', async () => {
    renderWizard();
    await uploadFile();
    await screen.findByText('FECHA');
    fireEvent.change(screen.getByLabelText('Fila de cabeceras'), { target: { value: '4' } });
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('headerRow=4'))).toBe(true),
    );
  });
});
