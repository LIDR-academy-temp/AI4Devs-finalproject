import { expect, test } from '@playwright/test'
import {
  FECHA_Y_HORA,
  MINUTO_Y_MEDIO_MS,
  abrirSituacion,
  bloqueDeEstado,
  exigirSinDesplazamientoHorizontal,
  ingresar,
  motivos,
  tarjeta,
} from './ayudantes.ts'

test.describe('HU1: ver si puedo aplicar ahora', () => {
  test('condiciones favorables con datos vigentes', async ({ page }) => {
    await abrirSituacion(page, 'favorables')

    const bloque = bloqueDeEstado(page)
    await expect(bloque).toContainText('Apto para aplicar')
    await expect(bloque).toContainText('Índice TIS')
    await expect(bloque).toContainText('10')
    await expect(bloque).toContainText(FECHA_Y_HORA)
    await expect(bloque).toContainText('Recomendación orientativa')
    await expect(motivos(page)).toContainText('no supera a la de 2 m')

    await expect(page.locator('.grilla > li')).toHaveCount(11)
    await expect(tarjeta(page, 'Temp Amb. a 2 Mts')).toContainText('20,3 °C')
    await expect(tarjeta(page, 'Anemómetro')).toContainText('9 km/h')
    await expect(tarjeta(page, 'Humedad de Hoja')).toContainText('Sin dato válido')
    await expect(tarjeta(page, 'Pluviometro')).toContainText('En alarma')
  })

  test('la franja de salud muestra el reloj, el último intento y el último dato', async ({ page }) => {
    await abrirSituacion(page, 'favorables')

    const salud = page.getByRole('region', { name: 'Salud de la estación' })
    // La pila de prueba corre en modo prueba, que no ejecuta ciclos: el semáforo lo dice.
    await expect(salud).toContainText('Modo prueba')
    await expect(salud).toContainText('Hora actual (Argentina, UTC−3)')
    await expect(salud).toContainText('terminó bien')
    await expect(salud).toContainText(/Último dato de SAT2\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
    await exigirSinDesplazamientoHorizontal(page)
  })

  test('estación inexistente', async ({ page }) => {
    await ingresar(page)

    await page.goto('/estaciones/999999')

    await expect(page.getByRole('alert')).toContainText('La estación no existe')
    await expect(bloqueDeEstado(page)).toHaveCount(0)
    await expect(page.locator('.grilla')).toHaveCount(0)
  })

  test('la falta de conexión no deja el estado anterior como vigente', async ({ page }) => {
    await page.clock.install()
    await abrirSituacion(page, 'favorables')
    await expect(bloqueDeEstado(page)).toContainText('Apto para aplicar')

    await page.route('**/api/v1/**', (ruta) => ruta.abort())
    await page.clock.fastForward(MINUTO_Y_MEDIO_MS)

    const bloque = bloqueDeEstado(page)
    await expect(bloque).toContainText('Sin conexión')
    await expect(bloque.getByRole('alert')).toContainText('Último estado conocido: Apto para aplicar')
    await expect(bloque).not.toContainText('Índice TIS')

    await page.unrouteAll()
    await page.clock.fastForward(MINUTO_Y_MEDIO_MS)
    await expect(bloque).toContainText('Índice TIS')
    await expect(bloque.getByRole('alert')).toHaveCount(0)
  })

  test('la sesión vencida lleva a la pantalla de acceso', async ({ page, context }) => {
    await page.clock.install()
    await abrirSituacion(page, 'favorables')

    await context.clearCookies()
    await page.clock.fastForward(MINUTO_Y_MEDIO_MS)

    await expect(page).toHaveURL(/\/acceso$/)
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  test.describe('a 360 píxeles', () => {
    test.use({ viewport: { width: 360, height: 800 } })

    test('la pantalla de decisión no tiene desplazamiento horizontal', async ({ page }) => {
      await abrirSituacion(page, 'inversion_poco_viento')
      await expect(bloqueDeEstado(page)).toContainText('No aplicar')
      await exigirSinDesplazamientoHorizontal(page)
    })
  })
})
