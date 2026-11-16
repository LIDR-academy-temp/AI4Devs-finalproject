import { TestBed } from '@angular/core/testing';

import { AuthService, TOKEN_STORAGE_KEY } from './auth.service';

describe('AuthService', () => {
  afterEach(() => sessionStorage.clear());

  it('no tiene token si la sesión está vacía', () => {
    const auth = TestBed.inject(AuthService);

    expect(auth.token()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('guarda el token en sessionStorage al ingresar', () => {
    const auth = TestBed.inject(AuthService);

    auth.login('  token-de-prueba  ');

    expect(auth.token()).toBe('token-de-prueba');
    expect(auth.isLoggedIn()).toBe(true);
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('token-de-prueba');
  });

  it('recupera el token guardado en la sesión', () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, 'token-previo');

    expect(TestBed.inject(AuthService).token()).toBe('token-previo');
  });

  it('borra el token al salir', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('token-de-prueba');

    auth.logout();

    expect(auth.token()).toBeNull();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
