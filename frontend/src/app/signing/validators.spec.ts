import { FormControl } from '@angular/forms';

import { checkPdfFile, cuilValidator } from './validators';

const pdf = (name: string, size: number, type = 'application/pdf') => {
  const file = new File(['%PDF-1.7'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('cuilValidator', () => {
  const check = (value: string) => cuilValidator(new FormControl(value));

  it('acepta 11 dígitos', () => expect(check('20123456786')).toBeNull());
  it('deja el campo vacío a cargo de required', () => expect(check('')).toBeNull());
  it('rechaza el CUIL con guiones', () => expect(check('20-12345678-6')).toEqual({ cuil: true }));
  it('rechaza menos de 11 dígitos', () => expect(check('2012345678')).toEqual({ cuil: true }));
  it('rechaza más de 11 dígitos', () => expect(check('201234567861')).toEqual({ cuil: true }));
  it('rechaza letras', () => expect(check('2012345678A')).toEqual({ cuil: true }));
  it('rechaza espacios alrededor', () => expect(check(' 20123456786')).toEqual({ cuil: true }));
});

describe('checkPdfFile', () => {
  const tenMb = 10 * 1024 * 1024;

  it('acepta un PDF de 200 KB', () => expect(checkPdfFile(pdf('resolucion.pdf', 200 * 1024), 10)).toBeNull());
  it('acepta la extensión en mayúsculas', () => expect(checkPdfFile(pdf('RESOLUCION.PDF', 1024), 10)).toBeNull());
  it('acepta un PDF de exactamente el tamaño máximo', () => expect(checkPdfFile(pdf('a.pdf', tenMb), 10)).toBeNull());
  it('rechaza un archivo que no es PDF', () =>
    expect(checkPdfFile(pdf('imagen.png', 1024, 'image/png'), 10)).toBe('not_pdf'));
  it('rechaza un PDF que supera el tamaño máximo', () =>
    expect(checkPdfFile(pdf('grande.pdf', tenMb + 1), 10)).toBe('too_large'));
  it('rechaza un archivo vacío como no PDF', () => expect(checkPdfFile(pdf('vacio.pdf', 0), 10)).toBe('not_pdf'));
});
