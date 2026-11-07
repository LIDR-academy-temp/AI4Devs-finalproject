import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { CASO_1 } from './ayudantes.ts'
import { enlace, esperarCorreo } from './correo.ts'
import { crearCuentaConfirmada, sql, vaciarLimitesPorIp } from './pila.ts'

const ASUNTO_CONFIRMACION = 'Confirme su cuenta de Weather Track'
const ASUNTO_RECUPERO = 'Elija una contraseña nueva para Weather Track'
const ASUNTO_CLAVE_CAMBIADA = 'Su contraseña de Weather Track cambió'
const LEYENDA_BAJA = 'Para darse de baja y borrar su cuenta y todos sus datos, abra este enlace:'

function correoNuevo(): string {
  return `cuenta-${randomUUID().slice(0, 8)}@weathertrack.example`
}

function fraseNueva(): string {
  return `una frase de prueba ${randomUUID().slice(0, 8)} bastante larga`
}

function cuentasCon(email: string): number {
  return Number(sql(`SELECT count(*) FROM usuario WHERE email = '${email}'`))
}

async function ingresarCon(page: Page, email: string, contrasena: string) {
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(contrasena)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test.describe('Cuentas: registro, recupero y bajas con los correos de Mailpit', () => {
  test.beforeEach(() => vaciarLimitesPorIp())

  test('registro, confirmación desde el correo, ingreso y baja desde la aplicación', async ({ page }) => {
    const email = correoNuevo()
    const contrasena = fraseNueva()

    await page.goto('/acceso')
    await page.getByRole('link', { name: 'Crear una cuenta' }).click()
    await expect(page.getByRole('heading', { name: 'Crear una cuenta' })).toBeVisible()
    await page.getByLabel('Nombre').fill('Ana')
    await page.getByLabel('Apellido').fill('Pérez')
    await page.getByLabel('Correo').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(contrasena)
    await page.getByLabel('Repetir la contraseña').fill(contrasena)
    await page.getByLabel('Localidad').fill('Pergamino')
    await page.getByLabel('Provincia').selectOption('Buenos Aires')
    await page.getByRole('checkbox', { name: /Acepto los términos/ }).check()
    await page.getByRole('button', { name: 'Crear la cuenta' }).click()
    await expect(page.getByRole('heading', { name: 'Revise su correo' })).toBeVisible()

    // Sin confirmar, la contraseña correcta no alcanza para entrar.
    await page.goto('/acceso')
    await ingresarCon(page, email, contrasena)
    await expect(page.getByRole('link', { name: 'Volver a enviar el correo de confirmación' })).toBeVisible()

    const correo = await esperarCorreo(email, ASUNTO_CONFIRMACION)
    expect(correo.texto).toContain(LEYENDA_BAJA)
    expect(correo.cabeceras['List-Unsubscribe']?.[0]).toMatch(/\/api\/v1\/cuenta\/baja-un-clic\?codigo=/)
    expect(correo.cabeceras['List-Unsubscribe-Post']).toEqual(['List-Unsubscribe=One-Click'])

    await page.goto(enlace(correo, '/confirmar'))
    await expect(page.getByRole('heading', { name: 'Cuenta confirmada' })).toBeVisible()
    expect(page.url()).not.toContain('codigo')

    await page.getByRole('link', { name: 'Ingresar' }).click()
    await ingresarCon(page, email, contrasena)
    await expect(page.getByRole('heading', { name: CASO_1, exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Mi cuenta' }).click()
    await expect(page.getByText(email)).toBeVisible()
    await page.getByLabel('Contraseña, para confirmar').fill(contrasena)
    await page.getByRole('button', { name: 'Borrar mi cuenta y mis datos' }).click()
    await expect(page.getByRole('status')).toHaveText('Su cuenta y todos sus datos se borraron.')
    expect(cuentasCon(email)).toBe(0)
  })

  test('recupero de la contraseña desde el correo, con un enlace de un solo uso', async ({ page }) => {
    const email = correoNuevo()
    const vieja = crearCuentaConfirmada(email)
    const nueva = fraseNueva()

    await page.goto('/acceso')
    await page.getByRole('link', { name: '¿Olvidó su contraseña?' }).click()
    // El ingreso también tiene un campo "Correo": hay que esperar a que cambie la pantalla.
    await expect(page.getByRole('heading', { name: 'Recuperar el acceso' })).toBeVisible()
    await page.getByLabel('Correo').fill(email)
    await page.getByRole('button', { name: 'Enviarme un enlace' }).click()
    await expect(page.getByRole('status')).toBeVisible()

    const correo = await esperarCorreo(email, ASUNTO_RECUPERO)
    const ruta = enlace(correo, '/restablecer')
    await page.goto(ruta)
    await page.getByLabel('Contraseña nueva').fill(nueva)
    await page.getByLabel('Repetir la contraseña').fill(nueva)
    await page.getByRole('button', { name: 'Guardar la contraseña' }).click()
    await expect(page.getByRole('heading', { name: 'Contraseña cambiada' })).toBeVisible()
    await esperarCorreo(email, ASUNTO_CLAVE_CAMBIADA)

    // El mismo enlace ya no sirve. Desde otra página, para que el navegador cargue de nuevo y no
    // solo cambie el fragmento de la dirección actual.
    await page.goto('about:blank')
    await page.goto(ruta)
    const otra = fraseNueva()
    await page.getByLabel('Contraseña nueva').fill(otra)
    await page.getByLabel('Repetir la contraseña').fill(otra)
    await page.getByRole('button', { name: 'Guardar la contraseña' }).click()
    await expect(page.getByRole('heading', { name: 'El enlace no sirve' })).toBeVisible()

    await page.goto('/acceso')
    await ingresarCon(page, email, vieja)
    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.')
    await ingresarCon(page, email, nueva)
    await expect(page.getByRole('heading', { name: CASO_1, exact: true })).toBeVisible()
  })

  test('baja desde el enlace del correo: abrirlo no borra, el botón sí', async ({ page, request }) => {
    const email = correoNuevo()
    const clave = crearCuentaConfirmada(email)
    expect((await request.post('/api/v1/auth/recupero', { data: { email } })).status()).toBe(202)
    const correo = await esperarCorreo(email, ASUNTO_RECUPERO)

    await page.goto(enlace(correo, '/baja'))
    const boton = page.getByRole('button', { name: 'Borrar mi cuenta y mis datos' })
    await expect(boton).toBeVisible()
    expect(page.url()).not.toContain('codigo')
    expect(cuentasCon(email)).toBe(1)

    await boton.click()
    await expect(page.getByRole('heading', { name: 'Baja realizada' })).toBeVisible()
    expect(cuentasCon(email)).toBe(0)

    await page.goto('/acceso')
    await ingresarCon(page, email, clave)
    await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.')
  })

  test('baja de un clic desde el programa de correo, con la cabecera List-Unsubscribe', async ({ request }) => {
    const email = correoNuevo()
    crearCuentaConfirmada(email)
    await request.post('/api/v1/auth/recupero', { data: { email } })
    const correo = await esperarCorreo(email, ASUNTO_RECUPERO)
    const destino = new URL(/<([^>]+)>/.exec(correo.cabeceras['List-Unsubscribe'][0])![1])
    const ruta = `${destino.pathname}${destino.search}`

    // Abrirla con GET, como lo haría un programa que revisa enlaces, no borra la cuenta.
    expect((await request.get(ruta)).status()).toBe(405)
    expect(cuentasCon(email)).toBe(1)

    const respuesta = await request.post(ruta, {
      form: { 'List-Unsubscribe': 'One-Click' },
    })
    expect(respuesta.ok()).toBe(true)
    expect(cuentasCon(email)).toBe(0)
  })
})
