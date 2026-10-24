import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '@/test/render';
import { buildListQuery } from '@/features/reconciliations/api';
import { ReconciliationsPage } from './ReconciliationsPage';

const ITEM = {
  id: 'r1',
  name: 'Diners agosto',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  status: 'COMPLETED',
  matchedPercent: 92.456,
  createdAt: '2026-09-02T10:00:00.000Z',
};
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ items: [ITEM], total: 45, page: 1, pageSize: 20 }), {
        status: 200,
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const lastUrl = () => String(fetchMock.mock.calls.at(-1)?.[0]);

describe('buildListQuery', () => {
  it('omite filtros vacíos e incluye la paginación', () => {
    expect(buildListQuery({ page: 2, pageSize: 20, status: '', from: '' })).toBe(
      '?page=2&pageSize=20',
    );
    expect(
      buildListQuery({
        page: 1,
        pageSize: 20,
        status: 'FAILED',
        from: '2026-08-01',
        to: '2026-08-31',
      }),
    ).toBe('?status=FAILED&from=2026-08-01&to=2026-08-31&page=1&pageSize=20');
  });
});

describe('Listado de conciliaciones', () => {
  it('muestra nombre, período, estado, porcentaje y fecha', async () => {
    renderPage(<ReconciliationsPage />);
    const link = await screen.findByRole('link', { name: 'Diners agosto' });
    expect(link).toHaveAttribute('href', '/reconciliations/r1');
    expect(screen.getByText('2026-08-01 – 2026-08-31')).toBeInTheDocument();
    expect(screen.getByText('Completada', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('92.5 %')).toBeInTheDocument();
    expect(screen.getByText('2026-09-02')).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 3 · 45 conciliaciones/)).toBeInTheDocument();
  });

  it('muestra un guion cuando aún no hay porcentaje', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            items: [{ ...ITEM, status: 'DRAFT', matchedPercent: null }],
            total: 1,
            page: 1,
            pageSize: 20,
          }),
        ),
      ),
    );
    renderPage(<ReconciliationsPage />);
    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('filtra por estado y por período reenviando la consulta desde la página 1', async () => {
    renderPage(<ReconciliationsPage />);
    await screen.findByRole('link', { name: 'Diners agosto' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(lastUrl()).toContain('page=2'));

    await user.selectOptions(screen.getByLabelText('Estado'), 'COMPLETED');
    await waitFor(() => expect(lastUrl()).toContain('status=COMPLETED'));
    expect(lastUrl()).toContain('page=1');

    await user.type(screen.getByLabelText('Período desde'), '2026-08-01');
    await waitFor(() => expect(lastUrl()).toContain('from=2026-08-01'));
  });

  it('indica cuando no hay resultados', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }))),
    );
    renderPage(<ReconciliationsPage />);
    expect(await screen.findByText('No hay conciliaciones que mostrar.')).toBeInTheDocument();
  });

  it('muestra un error si la API falla', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('{}', { status: 500 })));
    renderPage(<ReconciliationsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar');
  });
});
