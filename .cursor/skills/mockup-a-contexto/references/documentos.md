# Documentos de contexto — estructura y plantillas

Carpeta `Contexto Implementación <nombre>/`. Siete archivos con nombre fijo para que
cualquier agente (Claude, Cursor) los encuentre igual en cada proyecto.

## Reglas de redacción

- Español, frases cortas, voz activa. Tablas antes que párrafos.
- **Toda afirmación sobre el código cita `archivo:línea`** (o `archivo` + nombre del widget/función).
- Nombres de código, llaves y campos en `código`. Textos de UI entre «comillas latinas».
- Valores de color en hex + nombre del token (`#1F2349` · `TATheme.barMeta1Fill`).
- Enlaces entre documentos por sección: `[01 §3](01%20-%20Cambios%20por%20pantalla.md#3-…)`.
- Datos de ejemplo del mockup (nombres, cifras) nunca como valores reales.
- Cada documento abre con `[← README](README.md)` y cierra con **Registro de cambios**:

```markdown
## Registro de cambios

| Fecha | Cambio |
|---|---|
| AAAA-MM-DD | Alta a partir del mockup <nombre> |
```

---

## README.md

```markdown
# Contexto de Implementación — <nombre>

**Propósito:** traducir el mockup [`<archivo>`](<ruta>) <y la lista de cambios de negocio> a
instrucciones que `<proyecto>` (<stack>, rama `<rama>`) pueda implementar sin ambigüedad.

**Generado:** <fecha> · **Base de código revisada:** `<proyecto>` @ `<commit>` (<mensaje>)
**Modo:** delta contra `<mockup anterior>` | nuevo (sin mockup anterior; la línea base es el código)

## Qué cambia en una frase
<2–4 líneas>

## Reglas de oro (decisiones ya tomadas)
> **<regla>.** <qué implica en pantalla>.
El mockup <hace X>. **En la app eso no se replica:** <cómo se dibuja>.

## Los N cambios
| # | Cambio | Dónde en la app | Fuente del dato | Detalle |
|---|---|---|---|---|
| 1 | <cambio> | <pantalla / componente> | ARB nuevo `<key>` · API `<campo>` · tokens | [01 §1](…) |

> **Ojo:** <diferencias entre la lista y el mockup que el lector debe saber>.

## Qué contiene esta carpeta
| Documento | Contenido |
|---|---|
| 01 … 06 | <una línea cada uno> |
| [`../Mockups <nombre>/`](…) | Mockup interactivo + PNG por pantalla e idioma |

## Fuentes cruzadas
| Fuente | Rol |
|---|---|
| Mockup `<archivo>` | Diseño. Manda en lo visual dentro del alcance |
| Lista de cambios (<origen, fecha>) | Fuente de verdad del alcance |
| `<repo>/Docs/…` | Reglas vigentes de la feature |
| `<repo>/lib/…` @ `<rama>` | Estado real de la implementación |

## Fuera de alcance
<resumen> — lista completa en [06 §B](…).
```

## 01 - Cambios por pantalla.md

```markdown
# Cambios por pantalla — <nombre>

## 0. Componentes nuevos (si los hay)
| Propiedad | Valor |
|---|---|
| Nombre sugerido | `<Componente>` en `<archivo>` |
| Contenido | <líneas, tipografía, tokens> |
| Parámetros | `<param>: <tipo>` — <para qué> |
| Espaciado | <padding / gaps exactos> |
| Cuándo no se pinta | <estados> |
| Accesibilidad | <semántica> |

### Variantes por contexto (si hay idioma × país × rol × marca…)
| <Eje 1> \ <Eje 2> | … | … |
|---|---|---|
Tabla «quién · pantalla · de dónde sale el valor», helpers sugeridos y ejemplos.

## N. <Pantalla>  (una sección por pantalla del mockup)
**Archivo:** `<ruta>` · **Componente:** `<Widget>` · **Lámina:** `png/NN-…`
**Hoy** (orden de bloques): a → b → c   (`archivo:línea`)
**Nuevo:** a → **X (nuevo, cambio 2)** → b → c
| Bloque | Estado | Detalle | Condición | Fuente |
|---|---|---|---|---|
| X | nuevo | … | `cond` | `<campo>` |
| b | cambia | texto «…» → «…» | — | `<key>` |

### Estados  (cuando la pantalla tiene varios)
| Estado | Cuándo (código) | Bloques | ¿Cambia algo? |
|---|---|---|---|
| E1 | `<condición>` | … | Solo el encabezado |
Resumen estados × bloques (✓ / —) al final de la sección.

## N+1. Cambios que se propagan solos
Componentes compartidos tocados y todas las pantallas donde se ven (aunque el mockup no las dibuje).
```

## 02 - Textos y localización.md

Archivos de idioma del proyecto en la cabecera (p.ej. `app_es.arb`, `app_es_MX.arb`, `app_en.arb`…)
y el comando de regeneración (`flutter gen-l10n`, etc.). Si dos locales quedan iguales, decirlo
una vez con un asterisco (`es*` = es, es_MX, es_US).

```markdown
## 0. Origen de cada texto
Cada texto nuevo o cambiado lleva **Origen**: `ARB` (marco de UI) o `API` (contenido de negocio, estatus,
errores, campaña). Criterio en `contenido-configurable.md` §1: si negocio lo puede querer cambiar, es `API`.
Un texto `API` que el back todavía no manda: llave ARB **solo como respaldo** + pendiente del back en 06.

## 1. Llaves nuevas
| Llave | Origen | es* | en* | Placeholders | Campo del API (si Origen = API) |
|---|---|---|---|---|---|

## 2. Cambio K — <título>   (una sección por cambio de texto)
| Llave | Se usa en | es* hoy → nuevo | en* hoy → nuevo |
|---|---|---|---|

### Textos que vienen del API (los cambia el back)
| Texto | Campo | Origen |
|---|---|---|

## Lo que NO cambia (regla de oro)
| Llave | Valor actual | Motivo |
|---|---|---|

## Llaves eliminadas
| Llave | Motivo | Usos a quitar |
|---|---|---|
```

## 03 - Estilos y tokens.md

Solo si cambian colores, tipografía, espaciados o la anatomía de un componente.

```markdown
## 1. Dónde se usa (un solo punto de cambio si es posible)
| Lugar | Archivo | Línea |
|---|---|---|

## 2. Tokens: hoy vs nuevo
| Parte | Hoy (token · hex) | Nuevo (hex) | Token del mockup | Decisión |
|---|---|---|---|---|
| Fondo | `TATheme.x` `#E3F2FD` | `#ECEEF7` | `--navy-100` | Token nuevo: ΔE 7.9 contra el más cercano |
Constantes sugeridas (bloque de código en el lenguaje del proyecto).

## 3. Anatomía  (medidas, radios, cálculo de anchos, casos borde)
## 4. Etiquetas / estados del componente
```

Regla: cada token nuevo dice por qué no sirve el existente más cercano (ΔE del inventario).

## 04 - Datos y APIs.md

Solo si el mockup muestra datos que hoy no se pintan.

```markdown
## 1. Qué campo alimenta cada cifra
| Cifra en pantalla | Campo | Endpoint | Llamada de la app que ya lo trae |
|---|---|---|---|

## 2. Qué cuenta cada campo (según el back)
| Campo | Qué cuenta | Qué **no** es |
|---|---|---|

## 3. Cuidados al integrar
- Qué llamada guarda el dato y cuál **no** debe sobrescribirlo (p.ej. detalle con filtro vs global).
- Filtros: los hace la app en local o el servidor (citar el servicio).
- Llave ausente → `null` → no se pinta · llave en `0` → se pinta «0».
- No recalcular en cliente lo que el back ya suma.

## 4. Ejemplos (JSON recortado, ambiente)
## 5. Cambios en modelos de la app
| Modelo | Archivo | Cambio |
|---|---|---|
## 6. Pruebas sugeridas
| Caso | Esperado |
|---|---|
```

Si el back aún no entrega el dato: sección «Contrato propuesto» marcada como propuesta, y
pendiente en 06. Si ya lo entrega: citar la revisión del doc de API y el ambiente.

## 05 - Checklist de implementación.md

Bloques en orden de dependencia, cada tarea con archivo y verificación:

```markdown
## A. Textos (cambios …) — sin back
- [ ] `<archivo i18n>`: … (los N archivos) → `flutter gen-l10n`
## B. Estilos / componentes (cambios …)
## C. Pantallas (cambios …)
## D. Datos (cambios …) — depende de API <rev / ambiente>
## E. Back (fuera del frontend)
## F. Verificación
- [ ] Recorrer las láminas `png/` contra la app en <ambiente>, en todos los idiomas.
- [ ] Estados: vacío, cargando, error, parcial, cada rol / país.
- [ ] `<analyze / lint / tests del stack>`.

## Documentación del repo que hay que actualizar (misma tarea)
| Doc | Qué agregar |
|---|---|
```

## 06 - Decisiones y pendientes.md

```markdown
## A. Decisiones  (abiertas arriba, tomadas abajo; el número no cambia nunca)

### D1
**<Pregunta corta>.** Opciones: a) … b) … **Recomendación:** … (por qué).
Estado: abierta | tomada <fecha> → <decisión> | retirada <fecha> (<motivo>)

## B. Diferencias del mockup que no entran
| Diferencia en el mockup | Estado en la app hoy | Recomendación |
|---|---|---|
| <lo que dibuja el mockup> | <lo que hay> | **No** / Dejar como está / Opcional, bajo riesgo |
```

Al pedir decisiones al usuario: listar solo las abiertas, cada una con recomendación, máximo 5 por
ronda. Al recibir respuestas: pasar a «tomada», aplicar en todos los documentos que la citan y en
el mockup, y registrar en el Registro de cambios de cada archivo tocado.

---

## README del mockup (`Mockups <nombre>/README.md`)

```markdown
# Mockups — <nombre>
Dibujados con la **estructura real de `<proyecto>`**. A diferencia del mockup de diseño: <diferencias>.
Las cifras son de ejemplo; en la app salen de <04>.

## Archivos
| Archivo | Uso |
|---|---|
| `Mockup <nombre>.html` | Todas las pantallas; selector de idioma; anotaciones on/off. `?only=s04&lang=en&ann=0` |
| `png/NN-pantalla-<lang>.png` | Una imagen por pantalla e idioma, para tickets o para Cursor/Claude |

## Anotaciones
- Círculo rosa con número = cambio de la lista. · Texto con fondo rosa = texto nuevo o cambiado.
- Recuadro punteado = bloque nuevo. · Etiqueta gris = recordatorio («sin cambio», «ya existe»).

| PNG | Pantalla | Cambios |
|---|---|---|

## Regenerar
python <skill>/scripts/build_mockup.py <template> --assets-root <repo> --out "Mockup <nombre>.html"
python <skill>/scripts/render_screens.py "Mockup <nombre>.html" --out png [--only s04]
```
