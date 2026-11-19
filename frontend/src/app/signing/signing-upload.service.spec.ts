import { fileNameFromDisposition } from './signing-upload.service';

describe('fileNameFromDisposition', () => {
  it('prefiere el filename* en UTF-8', () =>
    expect(fileNameFromDisposition(`attachment; filename="resolucion.pdf"; filename*=UTF-8''resoluci%C3%B3n.pdf`)).toBe(
      'resolución.pdf',
    ));

  it('usa el nombre ASCII si no hay filename*', () =>
    expect(fileNameFromDisposition('attachment; filename="resolucion.pdf"')).toBe('resolucion.pdf'));

  it('usa el nombre ASCII si filename* está mal codificado', () =>
    expect(fileNameFromDisposition(`attachment; filename="a.pdf"; filename*=UTF-8''%E0%A4%A.pdf`)).toBe('a.pdf'));

  it('sin cabecera devuelve un nombre por defecto', () => expect(fileNameFromDisposition(null)).toBe('documento.pdf'));
});
