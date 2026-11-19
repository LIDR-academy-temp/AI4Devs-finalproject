import { beforeEach, describe, expect, test } from 'vitest'
import { readSigningLink } from './link'

const REQUEST_ID = '4c525ed7-3bed-488d-8e51-9af0b1ba461c'

function openUrl(url: string) {
  window.history.replaceState(null, '', url)
}

describe('readSigningLink', () => {
  beforeEach(() => openUrl('/'))

  test('lee el id de la ruta y el token del fragmento', () => {
    openUrl(`/sign/${REQUEST_ID}#t=abc.def`)

    expect(readSigningLink()).toEqual({ ok: true, requestId: REQUEST_ID, token: 'abc.def' })
  })

  test('quita el fragmento de la barra de direcciones', () => {
    openUrl(`/sign/${REQUEST_ID}?embed=1#t=abc.def`)

    readSigningLink()

    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe(`/sign/${REQUEST_ID}`)
    expect(window.location.search).toBe('?embed=1')
  })

  test('recupera el token guardado al recargar sin fragmento', () => {
    openUrl(`/sign/${REQUEST_ID}#t=abc.def`)
    readSigningLink()
    openUrl(`/sign/${REQUEST_ID}`)

    expect(readSigningLink()).toEqual({ ok: true, requestId: REQUEST_ID, token: 'abc.def' })
  })

  test('el token guardado de otra solicitud no sirve', () => {
    openUrl(`/sign/${REQUEST_ID}#t=abc.def`)
    readSigningLink()
    openUrl('/sign/00000000-0000-0000-0000-000000000000')

    expect(readSigningLink()).toEqual({ ok: false, error: 'incomplete_link' })
  })

  test.each([
    ['sin token', `/sign/${REQUEST_ID}`],
    ['token vacío', `/sign/${REQUEST_ID}#t=`],
    ['sin id', '/sign/#t=abc'],
    ['id que no es UUID', '/sign/123#t=abc'],
    ['otra ruta', '/#t=abc'],
  ])('enlace incompleto: %s', (_, url) => {
    openUrl(url)

    expect(readSigningLink()).toEqual({ ok: false, error: 'incomplete_link' })
  })
})
