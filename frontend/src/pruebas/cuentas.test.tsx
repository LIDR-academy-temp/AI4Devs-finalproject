import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { ProveedorDeSesion } from '../servicios/sesion'
import { ESTACION, NO_AUTENTICADO, abrir, simularApi } from './ayudantes'

const AVISO_GENERICO = 'Si el correo corresponde a una cuenta, le enviamos un enlace.'
const ENLACE_INVALIDO = {
  estado: 400,
  cuerpo: { codigo: 'ENLACE_INVALIDO', mensaje: 'El enlace no es válido o ya venció.' },
}
const CUENTA = {
  id: 7,
  email: 'ana@campo.example',
  nombre: 'Ana',
  apellido: 'Pérez',
  organizacion: null,
  telefono: null,
  localidad: 'Pergamino',
  provincia: 'Buenos Aires',
  acepta_novedades: false,
}

function Ubicacion() {
  const { pathname, hash } = useLocation()
  return <output aria-label="ubicación">{`${pathname}${hash}`}</output>
}

/** Como `abrir`, pero muestra la dirección actual para ver que el código se borra de ella. */
function abrirConUbicacion(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorDeSesion>
        <App />
        <Ubicacion />
      </ProveedorDeSesion>
    </MemoryRouter>,
  )
}

describe('ingreso de una cuenta sin confirmar', () => {
  it('ofrece volver a enviar el correo de confirmación', async () => {
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/login': {
        estado: 403,
        cuerpo: { codigo: 'CUENTA_SIN_CONFIRMAR', mensaje: 'Confirme su cuenta desde el correo que le enviamos.' },
      },
    })
    abrir('/acceso')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Correo'), 'ana@campo.example')
    await usuario.type(screen.getByLabelText('Contraseña'), 'una frase larga de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme su cuenta')
    expect(screen.getByRole('link', { name: 'Volver a enviar el correo de confirmación' })).toHaveAttribute(
      'href',
      '/reenviar-confirmacion',
    )
  })
})

describe('registro', () => {
  async function completar() {
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Nombre'), 'Ana')
    await usuario.type(screen.getByLabelText('Apellido'), 'Pérez')
    await usuario.type(screen.getByLabelText('Correo'), 'ana@campo.example')
    await usuario.type(screen.getByLabelText(/^Contraseña/), 'una frase larga de prueba')
    await usuario.type(screen.getByLabelText('Localidad'), 'Pergamino')
    await usuario.selectOptions(screen.getByRole('combobox'), 'Buenos Aires')
    return usuario
  }

  it('envía los datos, con novedades desmarcadas por defecto, y pide revisar el correo', async () => {
    let enviado: unknown
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/registro': (cuerpo) => {
        enviado = cuerpo
        return { estado: 202, cuerpo: { mensaje: AVISO_GENERICO } }
      },
    })
    abrir('/registro')
    const usuario = await completar()
    expect(screen.getByRole('checkbox', { name: /novedades/ })).not.toBeChecked()
    await usuario.click(screen.getByRole('checkbox', { name: /Acepto los términos/ }))
    await usuario.click(screen.getByRole('button', { name: 'Crear la cuenta' }))

    expect(await screen.findByRole('heading', { name: 'Revise su correo' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(AVISO_GENERICO)
    expect(screen.getByLabelText('Correo')).toHaveValue('ana@campo.example')
    expect(enviado).toEqual({
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@campo.example',
      contrasena: 'una frase larga de prueba',
      localidad: 'Pergamino',
      provincia: 'Buenos Aires',
      organizacion: null,
      telefono: null,
      acepta_terminos: true,
      acepta_novedades: false,
    })
  })

  it('muestra cada error junto a su campo y borra la contraseña', async () => {
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/registro': {
        estado: 422,
        cuerpo: {
          codigo: 'DATOS_INVALIDOS',
          mensaje: 'Revise los datos marcados.',
          campos: {
            contrasena: 'Esa contraseña es muy común.',
            acepta_terminos: 'Debe aceptar los términos.',
          },
        },
      },
    })
    abrir('/registro')
    const usuario = await completar()
    await usuario.click(screen.getByRole('button', { name: 'Crear la cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Revise los datos marcados.')
    const contrasena = screen.getByLabelText(/^Contraseña/)
    expect(contrasena).toHaveAttribute('aria-invalid', 'true')
    expect(contrasena).toHaveAccessibleDescription(/Esa contraseña es muy común\./)
    expect(contrasena).toHaveValue('')
    expect(screen.getByText('Debe aceptar los términos.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).not.toHaveAttribute('aria-invalid')
  })

  it('enlaza los términos y la política de privacidad', async () => {
    simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrir('/registro')
    expect((await screen.findAllByRole('link', { name: 'términos de uso' }))[0]).toHaveAttribute('href', '/terminos')
    expect(screen.getAllByRole('link', { name: 'política de privacidad' })[0]).toHaveAttribute('href', '/privacidad')
  })
})

describe('confirmación', () => {
  it('lee el código del fragmento, lo envía una vez y lo borra de la dirección', async () => {
    const enviados: unknown[] = []
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/confirmacion': (cuerpo) => {
        enviados.push(cuerpo)
        return { cuerpo: { mensaje: 'Su cuenta quedó confirmada.' } }
      },
    })
    abrirConUbicacion('/confirmar#codigo=abc123')

    expect(await screen.findByRole('heading', { name: 'Cuenta confirmada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/acceso')
    expect(enviados).toEqual([{ codigo: 'abc123' }])
    expect(screen.getByLabelText('ubicación')).toHaveTextContent(/^\/confirmar$/)
  })

  it('sin código no consulta la API y ofrece pedir otro enlace', async () => {
    const llamadas = simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrir('/confirmar')
    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace está incompleto')
    expect(screen.getByRole('button', { name: 'Enviar un enlace nuevo' })).toBeInTheDocument()
    expect(llamadas.filter((llamada) => llamada.startsWith('POST'))).toEqual([])
  })

  it('con un enlace vencido permite pedir otro y responde lo mismo exista o no la cuenta', async () => {
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/confirmacion': ENLACE_INVALIDO,
      'POST /auth/confirmacion/reenvio': { estado: 202, cuerpo: { mensaje: AVISO_GENERICO } },
    })
    abrir('/confirmar#codigo=vencido')
    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace no es válido o ya venció.')
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Correo'), 'ana@campo.example')
    await usuario.click(screen.getByRole('button', { name: 'Enviar un enlace nuevo' }))
    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_GENERICO)
  })
})

describe('recupero de la contraseña', () => {
  it('pide el enlace y muestra el aviso genérico', async () => {
    let enviado: unknown
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/recupero': (cuerpo) => {
        enviado = cuerpo
        return { estado: 202, cuerpo: { mensaje: AVISO_GENERICO } }
      },
    })
    abrir('/recuperar')
    expect(await screen.findByText(/Su usuario es el correo con el que se registró/)).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Correo'), 'ana@campo.example')
    await usuario.click(screen.getByRole('button'))
    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_GENERICO)
    expect(enviado).toEqual({ email: 'ana@campo.example' })
  })

  it('si las dos contraseñas no coinciden no consulta la API', async () => {
    const llamadas = simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrirConUbicacion('/restablecer#codigo=xyz')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Contraseña nueva'), 'una frase larga de prueba')
    await usuario.type(screen.getByLabelText('Repetir la contraseña'), 'otra frase larga distinta')
    await usuario.click(screen.getByRole('button', { name: 'Guardar la contraseña' }))
    expect(screen.getByLabelText('Repetir la contraseña')).toHaveAccessibleDescription('Las dos contraseñas no coinciden.')
    expect(llamadas.filter((llamada) => llamada.startsWith('POST'))).toEqual([])
    expect(screen.getByLabelText('ubicación')).toHaveTextContent(/^\/restablecer$/)
  })

  it('guarda la contraseña nueva con el código del enlace', async () => {
    let enviado: unknown
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/recupero/nueva-contrasena': (cuerpo) => {
        enviado = cuerpo
        return { cuerpo: { mensaje: 'Su contraseña se cambió.' } }
      },
    })
    abrir('/restablecer#codigo=xyz')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Contraseña nueva'), 'una frase larga de prueba')
    await usuario.type(screen.getByLabelText('Repetir la contraseña'), 'una frase larga de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Guardar la contraseña' }))
    expect(await screen.findByRole('heading', { name: 'Contraseña cambiada' })).toBeInTheDocument()
    expect(enviado).toEqual({ codigo: 'xyz', contrasena: 'una frase larga de prueba' })
  })

  it('con un enlace vencido ofrece pedir uno nuevo', async () => {
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/recupero/nueva-contrasena': ENLACE_INVALIDO,
    })
    abrir('/restablecer#codigo=vencido')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Contraseña nueva'), 'una frase larga de prueba')
    await usuario.type(screen.getByLabelText('Repetir la contraseña'), 'una frase larga de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Guardar la contraseña' }))
    expect(await screen.findByRole('heading', { name: 'El enlace no sirve' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/recuperar')
  })
})

describe('baja desde el correo', () => {
  it('abrir la página no borra nada: hace falta tocar el botón', async () => {
    let enviado: unknown
    const llamadas = simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /cuenta/baja-con-enlace': (cuerpo) => {
        enviado = cuerpo
        return { cuerpo: { mensaje: 'Su cuenta y todos sus datos se borraron.' } }
      },
    })
    abrirConUbicacion('/baja#codigo=baja1')
    const boton = await screen.findByRole('button', { name: 'Borrar mi cuenta y mis datos' })
    expect(llamadas.filter((llamada) => llamada.startsWith('POST'))).toEqual([])
    expect(screen.getByLabelText('ubicación')).toHaveTextContent(/^\/baja$/)

    await userEvent.setup().click(boton)
    expect(await screen.findByRole('heading', { name: 'Baja realizada' })).toBeInTheDocument()
    expect(enviado).toEqual({ codigo: 'baja1' })
  })

  it('sin código no muestra el botón', async () => {
    simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrir('/baja')
    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace está incompleto')
    expect(screen.queryByRole('button', { name: /Borrar/ })).not.toBeInTheDocument()
  })
})

describe('Mi cuenta', () => {
  const CON_SESION = { 'GET /estaciones': { cuerpo: [ESTACION] }, 'GET /cuenta': { cuerpo: CUENTA } }

  it('se abre desde el encabezado y muestra el correo sin poder cambiarlo', async () => {
    simularApi(CON_SESION)
    abrir('/cuenta')
    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta')
    expect(screen.getByText('ana@campo.example')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Correo' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
  })

  it('guarda los datos corregidos', async () => {
    let enviado: unknown
    simularApi({
      ...CON_SESION,
      'PUT /cuenta': (cuerpo) => {
        enviado = cuerpo
        return { cuerpo: { ...CUENTA, localidad: 'Rojas' } }
      },
    })
    abrir('/cuenta')
    const usuario = userEvent.setup()
    const localidad = await screen.findByLabelText('Localidad')
    await usuario.clear(localidad)
    await usuario.type(localidad, 'Rojas')
    await usuario.click(screen.getByRole('checkbox', { name: /novedades/ }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar los datos' }))
    expect(await screen.findByText('Datos guardados.')).toBeInTheDocument()
    expect(enviado).toMatchObject({ localidad: 'Rojas', acepta_novedades: true, organizacion: null })
  })

  it('una contraseña actual incorrecta se marca en su campo', async () => {
    simularApi({
      ...CON_SESION,
      'POST /cuenta/contrasena': {
        estado: 422,
        cuerpo: {
          codigo: 'DATOS_INVALIDOS',
          mensaje: 'Revise los datos marcados.',
          campos: { actual: 'La contraseña actual no es correcta.' },
        },
      },
    })
    abrir('/cuenta')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Contraseña actual'), 'equivocada')
    await usuario.type(screen.getByLabelText('Contraseña nueva'), 'una frase larga de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Contraseña actual')).toHaveAccessibleDescription(
        'La contraseña actual no es correcta.',
      ),
    )
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('')
  })

  it('al darse de baja vuelve al ingreso con el aviso', async () => {
    let enviado: unknown
    simularApi({
      ...CON_SESION,
      'POST /cuenta/baja': (cuerpo) => {
        enviado = cuerpo
        return { estado: 204 }
      },
    })
    abrir('/cuenta')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Contraseña, para confirmar'), 'una frase larga de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Borrar mi cuenta y mis datos' }))
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Su cuenta y todos sus datos se borraron.')
    expect(enviado).toEqual({ contrasena: 'una frase larga de prueba' })
  })
})

describe('textos legales', () => {
  it.each([
    ['/privacidad', 'Política de privacidad'],
    ['/terminos', 'Términos de uso'],
  ])('%s se ve sin sesión y está marcada como borrador con su versión', async (ruta, titulo) => {
    simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrir(ruta)
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Versión 2026-11. Borrador pendiente de revisión legal.')
  })
})
