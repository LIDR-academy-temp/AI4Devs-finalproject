import { expect, test } from '@playwright/test'
import { CASO_1, CASO_2, ingresar } from './ayudantes.ts'
import { cargarSituacion, sql } from './pila.ts'

function selector(page: import('@playwright/test').Page) {
  return page.getByRole('combobox', { name: 'Estación' })
}

test.describe('Estaciones: selector y equipo inactivo', () => {
  test.beforeEach(() => cargarSituacion('favorables'))

  test('el selector está en el encabezado con todas las estaciones', async ({ page }) => {
    await ingresar(page)
    await expect(selector(page)).toHaveValue(/\d+/)
    // Sin niveles de usuario, toda cuenta ve todas las estaciones, sin asignaciones.
    await expect(selector(page).getByRole('option')).toHaveText([CASO_1, CASO_2])
    await expect(page.getByRole('note')).toContainText('Modo de prueba')
  })

  test('se cambia de estación desde el selector', async ({ page }) => {
    await ingresar(page)

    await selector(page).selectOption({ label: CASO_2 })

    await expect(page.getByRole('heading', { name: CASO_2, exact: true })).toBeVisible()
    // El caso 2 nunca recibe lecturas.
    await expect(
      page.getByRole('region', { name: 'Recomendación de aplicación' }),
    ).toContainText('Datos insuficientes')
  })

  test.describe('con el caso 2 inactivo', () => {
    test.beforeEach(() => {
      sql("update estacion set activa = false, inactiva_desde = now() where id_equipo_sat2 = 2")
    })
    test.afterEach(() => {
      sql("update estacion set activa = true, inactiva_desde = null where id_equipo_sat2 = 2")
    })

    test('muestra solo sus históricos', async ({ page }) => {
      await ingresar(page)
      await selector(page).selectOption({ label: `${CASO_2} (Equipo inactivo)` })

      await expect(page.getByRole('heading', { name: CASO_2, exact: true })).toBeVisible()
      await expect(page.getByRole('status')).toContainText('Equipo inactivo - solo históricos')
      await expect(page.getByRole('region', { name: 'Recomendación de aplicación' })).toHaveCount(0)
      await expect(page.locator('.grilla')).toHaveCount(0)

      const sensores = page.getByRole('list', { name: 'Sensores' })
      await sensores.getByRole('link', { name: 'Temp Amb. a 2 Mts', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Temp Amb. a 2 Mts' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Últimos 31 días' })).toBeVisible()
    })
  })
})
