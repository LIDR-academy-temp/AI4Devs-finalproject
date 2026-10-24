import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { clearSession, getToken } from '@/auth/session';
import { LoginPage } from './LoginPage';
import { AppLayout } from '@/components/AppLayout';

const USER = {
  id: 'u1',
  name: 'Analista Demo',
  email: 'analista@demo.concilia.app',
  role: 'ANALYST',
  company: { id: 'c1', name: 'Comercial Demo S.A.' },
};

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function renderApp(initial = '/login') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/reconciliations" element={<h1>Conciliaciones</h1>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fill(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('Correo'), email);
  if (password) await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

describe('Login', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clearSession();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('valida el formato del correo y que haya contraseña sin llamar a la API', async () => {
    renderApp();
    await fill('no-es-correo', 'x');
    expect(await screen.findByRole('alert')).toHaveTextContent('Introduce un correo válido');

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Correo'));
    await user.type(screen.getByLabelText('Correo'), 'a@b.co');
    await user.clear(screen.getByLabelText('Contraseña'));
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Introduce tu contraseña');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra un mensaje genérico ante credenciales incorrectas', async () => {
    fetchMock.mockImplementation(() => json(401, { message: 'Correo o contraseña incorrectos' }));
    renderApp();
    await fill('analista@demo.concilia.app', 'mala');
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(getToken()).toBeNull();
  });

  it('muestra estado de carga mientras espera la respuesta', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    renderApp();
    await fill('analista@demo.concilia.app', 'Clave1');
    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled();
  });

  it('con credenciales correctas guarda la sesión y redirige al listado', async () => {
    fetchMock.mockImplementation(() => json(200, { accessToken: 'tok', user: USER }));
    renderApp();
    await fill(USER.email, 'Concilia2026!');
    expect(await screen.findByRole('heading', { name: 'Conciliaciones' })).toBeInTheDocument();
    expect(screen.getByText(/Comercial Demo S\.A\./)).toBeInTheDocument();
    expect(getToken()).toBe('tok');
  });

  it('una ruta protegida sin sesión redirige al login', async () => {
    renderApp('/reconciliations');
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('con token guardado recupera el usuario por /auth/me y envía Authorization', async () => {
    sessionStorage.setItem('concilia.token', 'tok-guardado');
    fetchMock.mockImplementation(() => json(200, USER));
    renderApp('/reconciliations');
    expect(await screen.findByRole('heading', { name: 'Conciliaciones' })).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok-guardado');
  });

  it('cerrar sesión descarta el token y vuelve al login', async () => {
    fetchMock.mockImplementation(() => json(200, { accessToken: 'tok', user: USER }));
    renderApp();
    await fill(USER.email, 'Concilia2026!');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it('un 401 de la API en una ruta protegida limpia la sesión y redirige al login', async () => {
    sessionStorage.setItem('concilia.token', 'tok-caducado');
    fetchMock.mockImplementation(() => json(401, { message: 'Unauthorized' }));
    renderApp('/reconciliations');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument(),
    );
    expect(getToken()).toBeNull();
  });
});
