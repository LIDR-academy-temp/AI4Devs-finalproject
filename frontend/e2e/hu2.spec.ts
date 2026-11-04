import { expect, test } from '@playwright/test'
import { abrirSituacion, bloqueDeEstado, motivos, tarjeta } from './ayudantes.ts'

const APTO = 'Apto para aplicar'

test.describe('HU2: entender la recomendación y no confiar en datos dudosos', () => {
  test('inversión térmica con índice bajo', async ({ page }) => {
    await abrirSituacion(page, 'inversion_indice_bajo')

    const bloque = bloqueDeEstado(page)
    await expect(bloque).toContainText('Precaución')
    await expect(bloque).not.toContainText(APTO)
    await expect(motivos(page)).toContainText('supera a la de 2 m en 0,3 °C')
  })

  test('inversión térmica con poco viento', async ({ page }) => {
    await abrirSituacion(page, 'inversion_poco_viento')

    await expect(bloqueDeEstado(page)).toContainText('No aplicar')
    await expect(motivos(page)).toContainText('supera a la de 2 m en 2 °C')
    await expect(motivos(page)).toContainText('viento de 4 km/h no supera el mínimo de 6,4 km/h')
  })

  test('índice elevado sin inversión', async ({ page }) => {
    await abrirSituacion(page, 'indice_elevado')

    await expect(bloqueDeEstado(page)).toContainText('Riesgo de deriva')
    await expect(motivos(page)).toContainText('El índice TIS es 50, mayor que 20')
  })

  test('falta una lectura necesaria', async ({ page }) => {
    await abrirSituacion(page, 'lectura_faltante')

    const bloque = bloqueDeEstado(page)
    await expect(bloque).toContainText('Datos insuficientes')
    await expect(bloque).not.toContainText('Índice TIS')
    await expect(motivos(page)).toContainText('Sin dato válido de: Temp Amb. a 10 Mts')
    await expect(tarjeta(page, 'Temp Amb. a 10 Mts')).toContainText('Sin dato válido')
  })

  test('datos desactualizados', async ({ page }) => {
    await abrirSituacion(page, 'desactualizada')

    const bloque = bloqueDeEstado(page)
    // El ciclo la calculó apta, pero tiene más de 30 minutos: no debe mostrarse como vigente.
    await expect(bloque).toContainText('Datos insuficientes')
    await expect(bloque).not.toContainText(APTO)
    await expect(bloque).not.toContainText('Índice TIS')
    await expect(motivos(page)).toContainText(/\d+ minutos/)
    await expect(page.getByRole('status')).toContainText('Los datos están desactualizados')
  })

  test('lectura sospechosa', async ({ page }) => {
    await abrirSituacion(page, 'sospechosa')

    const bloque = bloqueDeEstado(page)
    await expect(bloque).toContainText('Precaución')
    await expect(bloque).not.toContainText(APTO)
    await expect(motivos(page)).toContainText(
      'Lecturas sospechosas: Hum Amb. a 2 Mts, Hum Amb. a 10 Mts',
    )
    await expect(tarjeta(page, 'Hum Amb. a 2 Mts')).toContainText('Dato sospechoso')
    await expect(tarjeta(page, 'Hum Amb. a 10 Mts')).toContainText('Dato sospechoso')
  })

  test('sin conexión con la fuente de datos', async ({ page }) => {
    await abrirSituacion(page, 'fuente_caida')

    await expect(bloqueDeEstado(page)).toContainText('Datos insuficientes')
    await expect(page.getByRole('alert')).toContainText('Sin conexión con la fuente de datos')
  })
})
