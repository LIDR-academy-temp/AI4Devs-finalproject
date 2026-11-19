import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { App } from '../app';
import { routes } from '../app.routes';
import { AuthService, TOKEN_STORAGE_KEY } from '../core/auth.service';

describe('Acceso con el token de administración', () => {
  let fixture: ComponentFixture<App>;
  let router: Router;

  const page = () => fixture.nativeElement as HTMLElement;
  const heading = () => page().querySelector('h1')?.textContent?.trim();
  const button = (label: string) =>
    [...page().querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;

  async function open(url: string) {
    fixture = TestBed.createComponent(App);
    router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        providePrimeNG({}),
      ],
    });
  });

  afterEach(() => sessionStorage.clear());

  it('en el primer ingreso muestra el acceso y no «Firmar documento»', async () => {
    await open('/');

    expect(router.url).toBe('/acceso');
    expect(heading()).toBe('Acceso al panel');
    expect(page().textContent).not.toContain('Firmar documento');
    expect(button('Salir')).toBeUndefined();
  });

  it('con el token ingresado muestra «Firmar documento» y lo guarda en la sesión', async () => {
    await open('/acceso');
    const input = page().querySelector<HTMLInputElement>('input#admin-token')!;

    expect(button('Ingresar')!.disabled).toBe(true);
    input.value = 'token-de-prueba';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(button('Ingresar')!.disabled).toBe(false);
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(router.url).toBe('/firmar');
    expect(heading()).toBe('Firmar documento');
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('token-de-prueba');
  });

  it('tras un rechazo de la API muestra que el token no es válido', async () => {
    await open('/acceso?motivo=token-invalido');

    expect(page().textContent).toContain('El token de administración no es válido');
  });

  it('sin motivo no muestra el mensaje de rechazo', async () => {
    await open('/acceso');

    expect(page().textContent).not.toContain('no es válido');
  });

  it('«Salir» borra el token y vuelve al acceso', async () => {
    TestBed.inject(AuthService).login('token-de-prueba');
    await open('/firmar');
    expect(heading()).toBe('Firmar documento');

    button('Salir')!.click();
    await fixture.whenStable();

    expect(router.url).toBe('/acceso');
    expect(heading()).toBe('Acceso al panel');
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
