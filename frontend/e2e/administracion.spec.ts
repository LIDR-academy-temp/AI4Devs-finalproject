import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { CASO_1, ingresar } from './ayudantes.ts'
import { esperarCorreo } from './correo.ts'
import { compose, crearCuentaConfirmada, sql, vaciarLimitesPorIp } from './pila.ts'

const ASUNTO = 'Cambió la configuración de SAT2 en Weather Track'
// Valores ficticios: las pruebas nunca usan credenciales reales de SAT2.
const FICTICIA = {
  direccion: 'https://sat2.ejemplo.invalid/api',
  usuario: `usuario-ficticio-${randomUUID().slice(0, 8)}`,
  clave: `clave-ficticia-${randomUUID().slice(0, 8)}`,
}

test.describe('Administración de la configuración de SAT2', () => {
  test.beforeEach(() => vaciarLimitesPorIp())

  test('una cuenta común no ve la opción y la ruta no existe', async ({ page }) => {
    await ingresar(page)

    await expect(page.getByRole('link', { name: 'Mi cuenta' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)
    await page.goto('/administracion')
    await expect(page.getByText('Esta página no existe.')).toBeVisible()

    const respuesta = await page.request.get('/api/v1/administracion/sat2')
    const inexistente = await page.request.get('/api/v1/no-existe')
    expect(respuesta.status()).toBe(404)
    expect(await respuesta.json()).toEqual(await inexistente.json())
  })

  test('el administrador guarda una configuración, la ve en el registro y recibe el aviso', async ({ page }) => {
    const email = `admin-${randomUUID().slice(0, 8)}@weathertrack.example`
    const clave = crearCuentaConfirmada(email, 'Administración E2E')
    compose('exec', '-T', 'api', 'python', '-m', 'app.administracion', 'hacer-administrador', '--email', email)

    await page.goto('/acceso')
    await page.getByLabel('Correo').fill(email)
    await page.getByLabel('Contraseña').fill(clave)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('heading', { name: CASO_1, exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Administración' }).click()
    await expect(page.getByRole('heading', { name: 'Administración', level: 2 })).toBeVisible()
    const conexion = page.getByRole('region', { name: 'Conexión con SAT2' })
    await expect(conexion).toContainText('El modo actual, prueba, no consulta SAT2')

    await page.getByLabel('Dirección de SAT2').fill('http://sat2.ejemplo.invalid')
    await expect(page.getByText('viajarían sin cifrar')).toBeVisible()
    await page.getByLabel('Dirección de SAT2').fill(FICTICIA.direccion)
    await page.getByLabel('Usuario de SAT2').fill(FICTICIA.usuario)
    await page.getByLabel('Contraseña de SAT2').fill(FICTICIA.clave)
    await page.getByLabel('Su contraseña de Weather Track').fill(clave)
    await page.getByRole('button', { name: 'Guardar la configuración' }).click()

    await expect(page.getByText(/^Configuración guardada/)).toBeVisible()
    await expect(conexion).toContainText(`por ${email}`)
    await expect(page.getByRole('region', { name: 'Últimos cambios' })).toContainText(email)
    await expect(page.getByLabel('Contraseña de SAT2')).toHaveValue('')

    // Al recargar, la pantalla sigue sin mostrar los valores guardados.
    await page.reload()
    await expect(page.getByRole('region', { name: 'Conexión con SAT2' })).toContainText(`por ${email}`)
    await expect(page.getByLabel('Dirección de SAT2')).toHaveValue('')
    for (const valor of Object.values(FICTICIA)) {
      await expect(page.locator('body')).not.toContainText(valor)
    }

    // En la base solo hay texto cifrado.
    for (const valor of Object.values(FICTICIA)) {
      expect(
        sql(`SELECT position(convert_to('${valor}', 'UTF8') in contenido_cifrado) FROM configuracion_sat2`),
      ).toBe('0')
    }

    const aviso = await esperarCorreo(email, ASUNTO)
    expect(aviso.texto).toContain(`La guardó ${email}.`)
    for (const valor of Object.values(FICTICIA)) {
      expect(aviso.texto).not.toContain(valor)
    }
  })
})
