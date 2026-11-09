# Mockup HTML — contrato

El mockup que entrego **no es una copia del mockup de diseño**. Es la app real
(estructura, tokens, tipografía, componentes) con los cambios aplicados y
anotados. Se parte de [`../assets/mockup-base.html`](../assets/mockup-base.html).

## 1. Fidelidad

| Regla | Cómo |
|---|---|
| Tokens del proyecto | `:root` con los valores leídos del tema, agrupados y con comentario `/* fuente: archivo */`. Los tokens nuevos van en su propio grupo |
| Tipografía del proyecto | La fuente real (Google Fonts si existe; si no, fallback del sistema y anotarlo en el README) |
| Estructura real | App bar / header, paddings, radios y orden de bloques como en el código, no como en el diseño |
| Reglas de oro | Se dibujan respetadas, con badge gris («↓ App bar sin cambio») |
| Textos | Diccionario `S[lang]` con el mismo valor que las llaves i18n (comentario con la llave). Nada de texto suelto en el HTML |
| Datos | Cifras de ejemplo verosímiles y coherentes entre pantallas. Decirlo en el subtítulo |
| Estados | Una lámina por estado que cambie algo (vacío, formándose, sin datos…), no solo el feliz |
| Variantes | Si hay matriz (país × idioma × rol), una lámina `wide` que la muestre |
| Antes / después | Para cambios de tokens o anatomía, una lámina `wide` «Hoy vs nuevo» con los mismos valores |

## 2. Parámetros de URL

| Parámetro | Efecto |
|---|---|
| `?lang=<code>` | Idioma (uno de `CONFIG.langs`) |
| `?ann=0` | Sin anotaciones (versión limpia) |
| `?only=<id>` | Solo esa pantalla, sin visor; el título queda `H=<alto px>` |
| `?list=1` | El título queda `SCREENS={"langs":[…],"screens":[{"id","file","w"}…]}` |

`render_screens.py` depende de `only` + `H=` y de `list`. No quitarlos.

## 3. Registro de pantallas

```js
const SCREENS = [
  { id: 's04', file: '04-detalle-equipo-completo', render: sDetalle,
    title: { es: '04 · Detalle …', en: '04 · Detail …' },
    notes: { es: ['Archivo: <code>…</code>', 'Orden: …'], en: [...] } },
  { id: 's08', file: '08-anatomia-barra', wide: true, render: sAnatomia, ... },  // 820 px
  { id: 's20', file: '20-tablero-web', w: 1280, render: sTablero, ... },         // ancho propio
];
```

- `id` estable (`sNN`), nunca se reutiliza. `file` = nombre del PNG (`NN-kebab`).
- `notes` = lo mínimo para entender la lámina sin abrir los documentos: archivo, orden de bloques, condición, fuente del dato.
- Una función por pantalla; los estados de una misma pantalla pueden compartir función con parámetros.

## 4. Anotaciones

| Elemento | Helper / clase | Uso |
|---|---|---|
| Número de cambio | `a(n)` en línea · `aCorner(n)` en la esquina de una tarjeta | Mismo número que la tabla del README |
| Bloque nuevo | clase `hl` en el contenedor | Recuadro punteado |
| Texto nuevo o cambiado | `<span class="hlT">…</span>` + `a(n)` | Fondo y subrayado |
| Sin cambio / ya existe / recordatorio | `keep('texto')` | Badge gris |
| Leyenda | `CONFIG.rules` (reglas de oro) + `CONFIG.changes` | Arriba de todas las láminas |

Reglas: los badges **nunca** tapan contenido (en línea por defecto; `aCorner` solo en tarjetas con
aire alrededor). `?ann=0` debe dejar la pantalla idéntica a la app, sin huecos.

## 5. Recursos locales

Banderas, logos e iconos del repo con marcador `'__ASSET:<ruta relativa al repo>__'`.
`build_mockup.py --assets-root <repo>` los cambia por data URI. El HTML final funciona solo
(salvo la fuente web). **Siempre abrir y entregar el HTML final**, no el template.

## 6. Marcos

`CONFIG.frame = 'phone'` (390 px, barra de estado + app bar), `'desktop'` (1280 px, ventana WinUI con
barra de título y `NavigationView`; elementos en `CONFIG.nav`, activo con `opts.navOn`) o `'web'` (1280 px, barra del
navegador + header). Para otro dispositivo, agregar el ancho en `CONFIG.widths` y un marco nuevo
siguiendo `phone()` / `web()`.

## 7. Revisión visual (obligatoria)

Después de `render_screens.py`, abrir cada PNG:
- Nada encimado; textos sin cortar en el idioma más largo (normalmente inglés o alemán).
- Espacios iguales a los del código (cuidado con selectores CSS amplios: `.x>div`, no `.x div`).
- Los badges corresponden a la tabla de cambios.
- La versión `--ann 0` se ve como la app.
