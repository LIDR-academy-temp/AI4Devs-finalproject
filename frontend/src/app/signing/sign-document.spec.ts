import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { environment } from '../../environments/environment';
import { SignDocument } from './sign-document';

describe('Firmar documento', () => {
  let fixture: ComponentFixture<SignDocument>;
  let backend: HttpTestingController;

  const page = () => fixture.nativeElement as HTMLElement;
  const text = () => page().textContent ?? '';
  const button = (label: string) =>
    [...page().querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;

  async function type(id: string, value: string) {
    const input = page().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function chooseFile(file: File) {
    const input = page().querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  function pdf(name = 'resolucion.pdf', size = 200 * 1024, type = 'application/pdf') {
    const file = new File(['%PDF-1.7'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  }

  async function fillValidForm() {
    await type('signer-name', 'Firmante Demo');
    await type('signer-cuil', '20123456786');
    await chooseFile(pdf());
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG({})],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SignDocument);
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  describe('formulario', () => {
    it('«Cargar» empieza deshabilitado', () => {
      expect(button('Cargar')!.disabled).toBe(true);
    });

    it('con nombre, un CUIL de 11 dígitos y un PDF de 200 KB habilita «Cargar»', async () => {
      await fillValidForm();

      expect(text()).toContain('resolucion.pdf');
      expect(button('Cargar')!.disabled).toBe(false);
    });

    it('el email es opcional, pero si se completa debe ser válido', async () => {
      await fillValidForm();

      await type('signer-email', 'no-es-un-email');
      expect(text()).toContain('Ingresá un email válido');
      expect(button('Cargar')!.disabled).toBe(true);

      await type('signer-email', 'firmante@example.com');
      expect(button('Cargar')!.disabled).toBe(false);
    });

    it('un nombre con solo espacios no es válido', async () => {
      await fillValidForm();
      await type('signer-name', '   ');

      expect(text()).toContain('Ingresá el nombre del firmante');
      expect(button('Cargar')!.disabled).toBe(true);
    });

    it('un CUIL con guiones muestra el mensaje y deja «Cargar» deshabilitado', async () => {
      await fillValidForm();
      await type('signer-cuil', '20-12345678-6');

      expect(text()).toContain('El CUIL debe tener 11 dígitos, sin guiones');
      expect(button('Cargar')!.disabled).toBe(true);
    });

    it('un archivo que no es PDF muestra el mensaje y no queda seleccionado', async () => {
      await type('signer-name', 'Firmante Demo');
      await type('signer-cuil', '20123456786');
      await chooseFile(pdf('imagen.png', 1024, 'image/png'));

      expect(text()).toContain('Elegí un archivo PDF');
      expect(text()).not.toContain('imagen.png');
      expect(button('Cargar')!.disabled).toBe(true);
    });

    it('un PDF demasiado grande muestra el mensaje y no queda seleccionado', async () => {
      await type('signer-name', 'Firmante Demo');
      await type('signer-cuil', '20123456786');
      await chooseFile(pdf('grande.pdf', 10 * 1024 * 1024 + 1));

      expect(text()).toContain('El archivo supera los 10 MB');
      expect(text()).not.toContain('grande.pdf');
      expect(button('Cargar')!.disabled).toBe(true);
    });

    it('elegir un PDF válido después de uno rechazado borra el mensaje', async () => {
      await chooseFile(pdf('imagen.png', 1024, 'image/png'));
      await chooseFile(pdf());

      expect(text()).not.toContain('Elegí un archivo PDF');
      expect(text()).toContain('resolucion.pdf');
    });
  });

  describe('carga y resultado', () => {
    const uploadUrl = `${environment.apiUrl}/admin/signing-uploads`;
    const created = {
      id: '788f4c5c-aade-40d2-921f-68371e48cfbb',
      document_id: '9977faf9-7bb8-4b46-a745-7a498934564c',
      status: 'pending',
      signing_url: `${environment.widgetUrl}/sign/788f4c5c-aade-40d2-921f-68371e48cfbb#t=abc.def`,
      created_at: '2026-11-16T19:31:30Z',
    };

    async function submit() {
      page().querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      return backend.expectOne({ method: 'POST', url: uploadUrl });
    }

    async function respond(req: ReturnType<HttpTestingController['expectOne']>, body: object, status: number) {
      req.flush(body, { status, statusText: String(status) });
      await fixture.whenStable();
    }

    const apiError = (code: string, details: object | null = null) => ({ code, message: code, details });
    const iframe = () => page().querySelector<HTMLIFrameElement>('iframe');
    const inputValue = (id: string) => page().querySelector<HTMLInputElement>(`#${id}`)!.value;

    beforeEach(fillValidForm);

    it('envía el formulario como multipart y muestra el progreso', async () => {
      await type('signer-email', 'firmante@example.com');
      const req = await submit();

      const body = req.request.body as FormData;
      expect((body.get('file') as File).name).toBe('resolucion.pdf');
      expect(body.get('signer_full_name')).toBe('Firmante Demo');
      expect(body.get('signer_identifier')).toBe('20123456786');
      expect(body.get('signer_email')).toBe('firmante@example.com');
      expect(text()).toContain('Cargando el documento…');
      expect(button('Cargar')).toBeUndefined();

      await respond(req, created, 201);
    });

    it('no envía el email si quedó vacío', async () => {
      const req = await submit();

      expect((req.request.body as FormData).has('signer_email')).toBe(false);
      await respond(req, created, 201);
    });

    it('tras una carga exitosa muestra el widget embebido con la signing_url', async () => {
      await respond(await submit(), created, 201);

      expect(iframe()!.src).toBe(created.signing_url);
      expect(iframe()!.title).toBe('Widget de firma de Firmadoc');
      expect(text()).toContain('resolucion.pdf');
      expect(text()).toContain('Firmante Demo');
      expect(page().querySelector('form')).toBeNull();
    });

    it('«Descargar original» baja la v1 con su nombre de archivo', async () => {
      await respond(await submit(), created, 201);
      const createObjectURL = vi.fn(() => 'blob:firmadoc/original');
      const revokeObjectURL = vi.fn();
      const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
      Object.assign(URL, { createObjectURL, revokeObjectURL });
      onTestFinished(() => {
        Object.assign(URL, original);
      });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      button('Descargar original')!.click();
      const req = backend.expectOne(`${environment.apiUrl}/documents/${created.document_id}/versions/1/download`);
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['%PDF-1.7']), {
        headers: { 'Content-Disposition': `attachment; filename="resolucion.pdf"; filename*=UTF-8''resoluci%C3%B3n.pdf` },
      });
      await fixture.whenStable();

      const anchor = click.mock.contexts[0] as HTMLAnchorElement;
      expect(anchor.download).toBe('resolución.pdf');
      expect(anchor.href).toBe('blob:firmadoc/original');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:firmadoc/original');
    });

    it('si la descarga falla lo informa sin perder el resultado', async () => {
      await respond(await submit(), created, 201);

      button('Descargar original')!.click();
      backend
        .expectOne(`${environment.apiUrl}/documents/${created.document_id}/versions/1/download`)
        .flush(new Blob(), { status: 503, statusText: 'Unavailable' });
      await fixture.whenStable();

      expect(text()).toContain('No pudimos descargar el documento');
      expect(iframe()).not.toBeNull();
    });

    it('«Cargar otro documento» quita el resultado y deja el formulario vacío', async () => {
      await respond(await submit(), created, 201);

      button('Cargar otro documento')!.click();
      await fixture.whenStable();

      expect(iframe()).toBeNull();
      expect(inputValue('signer-name')).toBe('');
      expect(inputValue('signer-cuil')).toBe('');
      expect(text()).not.toContain('resolucion.pdf');
      expect(button('Cargar')!.disabled).toBe(true);
    });

    it('una signing_url fuera del widget configurado no crea el iframe', async () => {
      await respond(await submit(), { ...created, signing_url: 'https://otro-sitio.example/sign/1#t=abc' }, 201);

      expect(iframe()).toBeNull();
      expect(text()).toContain('La dirección del widget no coincide con la configurada');
    });

    it('un PDF inválido muestra el mensaje y conserva los datos', async () => {
      await respond(await submit(), apiError('invalid_pdf'), 422);

      expect(text()).toContain('El archivo no es un PDF válido o está protegido con contraseña');
      expect(inputValue('signer-name')).toBe('Firmante Demo');
      expect(inputValue('signer-cuil')).toBe('20123456786');
      expect(text()).toContain('resolucion.pdf');
      expect(button('Cargar')!.disabled).toBe(false);
    });

    it('un archivo demasiado grande según la API muestra el mensaje', async () => {
      await respond(await submit(), apiError('file_too_large'), 422);

      expect(text()).toContain('El archivo supera el tamaño máximo permitido');
    });

    it('un validation_error marca el campo con el mensaje de la API', async () => {
      const details = { errors: [{ field: 'signer_identifier', message: 'El CUIL no es válido para la API' }] };
      await respond(await submit(), apiError('validation_error', details), 422);

      expect(text()).toContain('El CUIL no es válido para la API');
      expect(page().querySelector('#signer-cuil')!.classList).toContain('ng-invalid');
      expect(button('Cargar')!.disabled).toBe(true);

      await type('signer-cuil', '20123456786');
      expect(text()).not.toContain('El CUIL no es válido para la API');
      expect(button('Cargar')!.disabled).toBe(false);
    });

    it('si la API no está disponible lo informa y conserva los datos', async () => {
      await respond(await submit(), apiError('internal_error'), 503);

      expect(text()).toContain('No pudimos conectar con Firmadoc. Intentá de nuevo en unos minutos.');
      expect(inputValue('signer-name')).toBe('Firmante Demo');
    });

    it('si falla la red lo informa igual que una API no disponible', async () => {
      (await submit()).error(new ProgressEvent('error'));
      await fixture.whenStable();

      expect(text()).toContain('No pudimos conectar con Firmadoc. Intentá de nuevo en unos minutos.');
    });

    it('un nuevo envío borra el error anterior', async () => {
      await respond(await submit(), apiError('invalid_pdf'), 422);
      const req = await submit();

      expect(text()).not.toContain('no es un PDF válido');
      await respond(req, created, 201);
    });
  });
});
