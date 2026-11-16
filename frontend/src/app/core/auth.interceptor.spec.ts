import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    sessionStorage.clear();
  });

  it('agrega Authorization: Bearer a las llamadas a la API', () => {
    auth.login('token-de-prueba');

    http.get(`${environment.apiUrl}/health`).subscribe();

    const req = backend.expectOne(`${environment.apiUrl}/health`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush({});
  });

  it('no envía el token a otros orígenes', () => {
    auth.login('token-de-prueba');

    http.get('https://otro-sitio.example/datos').subscribe();

    const req = backend.expectOne('https://otro-sitio.example/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no agrega la cabecera si no hay token', () => {
    http.get(`${environment.apiUrl}/health`).subscribe();

    const req = backend.expectOne(`${environment.apiUrl}/health`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('ante un 401 de la API borra el token y vuelve al acceso con el motivo', () => {
    auth.login('token-vencido');
    let status = 0;

    http.get(`${environment.apiUrl}/admin/signing-uploads`).subscribe({ error: (e) => (status = e.status) });
    backend
      .expectOne(`${environment.apiUrl}/admin/signing-uploads`)
      .flush({ code: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(auth.token()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/acceso'], { queryParams: { motivo: 'token-invalido' } });
  });

  it('no cierra la sesión ante otros errores', () => {
    auth.login('token-de-prueba');

    http.get(`${environment.apiUrl}/health`).subscribe({ error: () => undefined });
    backend.expectOne(`${environment.apiUrl}/health`).flush({}, { status: 503, statusText: 'Unavailable' });

    expect(auth.token()).toBe('token-de-prueba');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
