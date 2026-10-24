import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/** Renderiza una página con router en memoria y un QueryClient limpio (sin reintentos). */
export function renderPage(element: ReactElement, { path = '/', initial = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/reconciliations/:id" element={<h1>Detalle de conciliación</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
