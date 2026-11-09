---
name: mockup-a-contexto
description: "Convierte un mockup (HTML normal o bundled, URL, imágenes o PDF) en contexto implementable. Para el frontend: documentos md (pantallas, textos, estilos, datos, checklist, decisiones), un mockup HTML interactivo con la estructura REAL de la app y anotaciones por cambio, y PNG por pantalla e idioma (modos delta y nuevo). Para el backend sin acceso al frontend (modo flujo): mapa de pantallas y navegación, acciones → operaciones, datos por pantalla, modelo de datos candidato, reglas y máquinas de estado, para diseñar endpoints y tablas. Usar cuando el usuario comparte un mockup o diseño, pide traducirlo a contexto, specs, flujo, endpoints, tablas o capturas, o lo necesita como el documento «Mockup / Diseño Visual» del gate de /definir."
metadata:
  trigger: "mockup, diseño, prototipo, pantallas, figma, html del diseño, capturas, png, contexto de implementación, frontend, mobile, flutter, react, razor, traducir mockup, flujo, endpoints, tablas, backend"
---

# Mockup a contexto

Rol: leo un mockup y el proyecto sobre el que se va a aplicar, y entrego
**contexto implementable**. Para el frontend: qué cambia en cada pantalla, en qué
archivo y componente, con qué textos, tokens y datos, y qué queda fuera. Para el
backend (modo flujo): qué hace el usuario, qué ve, qué se guarda y con qué reglas.
**No modifico código** (modo análisis): solo escribo en la carpeta de salida.

El mockup dice **qué se quiere ver**. El código dice **qué existe hoy y cómo se
construye**. La lista de negocio o el markdown de contexto dicen **qué entra**. Mi
trabajo es cruzar las tres cosas y dejar por escrito cada diferencia.

## Relación con SDD

- La carpeta que genero **es** el documento «Mockup / Diseño Visual» del gate de
  entradas de `sdd-workflow` / `/definir`, y cubre la parte de UI del «Contexto Técnico».
- Si hay `sdd.config.yaml`: leer `vars` y `targets`; el repo frontend sale de
  `vars.RUTA_REPO_MOBILE` / `RUTA_REPO_FRONT` / `RUTA_REPO_WEB_LEGACY` /
  `RUTA_REPO_ASPNET_CORE` según el target, y su profile de `sdd-toolkit/profiles/<target>.md`
  manda sobre las convenciones genéricas de [`references/lectura-frontend.md`](references/lectura-frontend.md).
- Sin `sdd.config.yaml` la skill funciona igual: pido la ruta del repo (o el markdown de contexto en modo flujo).
- Al terminar, handoff: «`/definir` con esta carpeta como Mockup / Diseño Visual».

### Dónde se guarda (carpeta de salida)

Primera regla que aplique:

1. La ruta que diga el usuario.
2. Hay ticket y `vars.RUTA_MOCKUPS` → `<RUTA_MOCKUPS>/<TKT>/`.
3. Hay ticket sin `RUTA_MOCKUPS` → `<RUTA_SPECS>/<TKT>/mockup/` (junto a `spec.md` / `design.md`).
4. Sin ticket → junto al mockup fuente.

`<TKT>` con el mismo formato que las carpetas de `RUTA_SPECS` del proyecto (p.ej. `TKT-15252`).
La carpeta del ticket es **una sola** para back y front: cada modo agrega sus carpetas
(`Contexto Backend …`, `Contexto Implementación …`, `Mockups …`) sin pisar las del otro.
`RUTA_MOCKUPS` sirve cuando los mockups viven fuera del repo de contexto (unidad compartida, carpeta
del equipo de diseño); es opcional.

## Entradas (gate — si falta una obligatoria, STOP y listar)

| Entrada | Delta / nuevo (frontend) | Flujo (backend) | Notas |
|---|---|---|---|
| Mockup nuevo | Obligatorio | Obligatorio — **uno por canal**: app y web (clientes); WinUI / ERP (administración) si existe | `.html` (normal o bundled), URL, carpeta, `.png`/`.jpg`, `.pdf`. Si es URL: **pedir permiso antes de descargar** (nombre, origen, tamaño) |
| Proyecto frontend | Obligatorio | No se usa | Ruta del repo + rama. Se lee, no se toca |
| Markdown de contexto del proyecto/módulo | Opcional | **Obligatorio** | Manda en reglas, alcance y vocabulario |
| Repo del back + MCP de la base | Opcional | Recomendado | Para reusar tablas, SPs, catálogos y endpoints. Sin acceso se declara |
| Mockup anterior | Opcional → **delta** | Opcional | La versión previa del mismo diseño |
| Lista de cambios de negocio | Opcional | Opcional | Si existe, **manda sobre el mockup** en alcance |
| Reglas ya decididas | Opcional | Opcional | Ej. «los títulos de la app bar no cambian». Se vuelven reglas de oro |
| Docs de API / back | Si el mockup muestra datos nuevos | Si existen | Leer la revisión vigente antes de proponer campos |

## Modos

| | **Delta** (frontend, hay mockup anterior) | **Nuevo** (frontend, no hay mockup anterior) | **Flujo** (backend, sin repo del frontend) |
|---|---|---|---|
| Para qué | Implementar el cambio en el frontend | Implementar la pantalla en el frontend | Diseñar endpoints y tablas |
| Línea base del estado actual | El código del frontend (el mockup anterior solo aísla lo nuevo) | El código del frontend | El markdown de contexto + la base/repo del back si hay acceso |
| De dónde sale la lista de cambios | Lista de negocio, o el diff anterior → nuevo | Lista de negocio, o la derivo contra el código y **la confirmo antes de documentar** | Casos de uso del contexto + acciones del mockup, **confirmados antes de documentar** |
| Inventario | `--compare anterior --tokens … --i18n …` | `--tokens … --i18n …` | `--flow`; con varios canales `--channel app=… --channel web=… [--channel erp:admin=…] --flow` |
| Salida | `Contexto Implementación …` + `Mockups …` (uno por canal) | Igual | **Un solo** `Contexto Backend …` para todos los canales (+ `00 - Matriz de canales` si hay 2+) y `png/` de cada original ([`references/flujo-backend.md`](references/flujo-backend.md)) |
| Riesgo principal | Que el mockup anterior no refleje lo implementado | Que el mockup traiga otro sistema visual | Tomar un dato de ejemplo como regla de negocio |

En modo nuevo cada elemento del mockup cae en una de tres clases, y así se documenta:
**existe** (ya está igual en el código), **cambia** (existe pero distinto: texto, color,
orden, condición) o **nuevo** (no hay nada equivalente). Para «nuevo» aplicar la escalera
de alcance: reusar componente → extender (parámetro) → componente nuevo.

## Principios (no negociables)

1. **El código manda sobre el estado actual.** Nada de «hoy la pantalla muestra X» sin `archivo:línea`.
2. **La lista de negocio manda sobre el alcance; el mockup, sobre lo visual dentro de ese alcance.** Lo que el mockup trae y nadie pidió va a «Diferencias que no se adoptan», no se implementa.
3. **Reglas de oro primero.** Si una decisión ya tomada contradice el mockup (p.ej. app bar), el mockup que entrego se dibuja con la regla, no con el diseño original, y se marca con el badge gris.
4. **Reusar antes que crear.** Color del mockup → token existente más cercano (`mockup_inventory.py --tokens`). Texto → llave i18n existente (`--i18n`). Token o llave nuevos solo cuando no hay equivalente, y se listan como nuevos.
5. **Cada cambio con dirección completa:** pantalla · archivo · componente/widget · llave(s) i18n · fuente del dato · condición de visibilidad.
6. **Estados que el mockup no dibuja se enumeran desde el código:** cargando, vacío, error, parcial, sin permiso, por rol, por país/idioma. Un estado sin pantalla en el mockup igual lleva su fila y, si cambia algo, su lámina.
7. **Variantes por contexto en una matriz explícita** (idioma × país × rol × marca…). Nunca inferir una regla de un ejemplo.
8. **Datos:** qué campo alimenta cada cifra, qué llamada lo trae y cuál no debe sobrescribirlo, `null` (llave ausente → no pintar) vs `0` (pintar «0»), no recalcular en cliente lo que el back ya suma, filtros locales vs de servidor según el código.
9. **Textos:** todos los archivos de idioma (valor actual → nuevo) y ningún texto fijo en el código. Si un texto viene del API, va a la lista de cambios del back.
10. **Decisiones con número estable** (D1, D2…). Una decisión retirada se marca «retirada», no se renumera. Cada documento lleva **Registro de cambios**.
11. **Contenido configurable.** Lo que negocio puede querer cambiar (textos de negocio, estatus, errores, umbrales,
    tonos, flags) sale del back, no del ARB ni de un literal en un SP; publicar en iOS tarda hasta 5 días.
    Estándar en [`references/contenido-configurable.md`](references/contenido-configurable.md).
12. **No inventar.** Lo que no se puede confirmar en código, API o con el usuario va a pendientes como pregunta, marcado `(asumido)` si se usó para avanzar.

### Back y front en el mismo ticket

Cuando el mismo equipo (o la misma sesión) tiene acceso a los dos repos:

1. **Flujo** primero, con **todos** los mockups del proyecto (app + web) → un `Contexto Backend …` con su matriz de canales.
2. El back pasa por `/definir` → `/diseñar` → … y al cerrar entrega `TKT-*-APIS.md` (fase `/revisar`).
3. **Delta o nuevo** después → `Contexto Implementación …`: su documento 04 se arma con el
   `TKT-*-APIS.md` (o, si el back aún no cierra, con 02/03 del `Contexto Backend`, marcado como propuesta).
4. El paso 3 se corre **una vez por canal**, cada uno contra su repo (app → `RUTA_REPO_MOBILE`,
   web → `RUTA_REPO_FRONT` / `RUTA_REPO_ASPNET_CORE`…). Las carpetas llevan el canal:
   `Contexto Implementación <nombre> — App/`, `Mockups <nombre> — Web/`.

Si el back ya cerró antes de que llegue el mockup al front, se salta el paso 1.

## Flujo

> **Modo flujo:** los pasos 0, 1 y 7–8 son iguales; los pasos 2–6 se reemplazan por
> [`references/flujo-backend.md`](references/flujo-backend.md) (inventario `--flow`, recorrido de
> todas las rutas, cruce contra la base, documentos `Contexto Backend`, captura `--full` del original).

Los scripts viven en `scripts/` junto a este archivo (instalado: `.claude/skills/mockup-a-contexto/scripts/`
o `.cursor/skills/mockup-a-contexto/scripts/`). Python 3.9+, solo librería estándar. Las
capturas usan Chrome o Edge sin ventana. Archivos temporales → scratchpad, no el repo.

### 0. Gate y carpeta
Verificar entradas (tabla de arriba), elegir modo, crear la carpeta de salida (regla de «Dónde se guarda»). Si el usuario
dio reglas o decisiones en el chat, anotarlas ya como reglas de oro / D-n.

### 1. Preparar el mockup
- Bundle (`<script type="__bundler/manifest">`): `python scripts/unpack_bundle.py <mockup.html> <tmp>/nuevo`.
  Repetir con el anterior si hay modo delta.
- HTML normal: se lee directo. Imágenes / PDF: leerlas visualmente pantalla por pantalla y
  transcribir textos a mano (el inventario automático no aplica).
- Abrir el mockup en el navegador y recorrer **todas** sus pantallas y estados (botones de
  escenario, toggles, pestañas). Listar las pantallas con un id estable (`sNN`).

### 2. Leer el proyecto frontend
Guía por stack en [`references/lectura-frontend.md`](references/lectura-frontend.md). Por cada pantalla del mockup:
encontrar la pantalla real (ruta, archivo, componente raíz), el orden actual de bloques, las
condiciones de visibilidad, los textos (llaves), el tema/tokens, los componentes compartidos
y la fuente de cada dato. Sin equivalente → «pantalla nueva».

Con 3+ áreas que leer, repartir en subagentes de exploración en paralelo (pantallas, tema+i18n,
datos/API) y quedarse solo con las conclusiones.

Después correr el cruce automático:
```bash
python scripts/mockup_inventory.py <mockup> [--compare <anterior>] \
  --tokens <archivos/carpetas del tema> --i18n <archivos/carpetas de idioma> \
  --out <tmp>/inventario.md --json <tmp>/inventario.json
```
El reporte separa textos `existe` / `parecido` / `nuevo` (con la llave que ya los tiene) y colores
`igual` / `cercano` / `sin token` (con el token más cercano y su ΔE). Es heurístico: ignorar datos de
ejemplo (nombres, cifras) y confirmar cada fila contra el archivo citado.

### 3. Lista de cambios y reglas
Armar la tabla «# · cambio · dónde en la app · fuente del dato · detalle». Con lista de negocio:
mapear cada punto. Sin lista (modo nuevo): derivarla del cruce y **confirmarla con el usuario**
(máx. 5 preguntas, con recomendación). Separar desde aquí lo que el mockup trae pero no entra.

### 4. Escribir los documentos
Estructura y plantillas en [`references/documentos.md`](references/documentos.md):
`README` · `01 Cambios por pantalla` · `02 Textos y localización` · `03 Estilos y tokens` ·
`04 Datos y APIs` · `05 Checklist de implementación` · `06 Decisiones y pendientes`.
Se omite un documento solo si no aplica (p.ej. sin datos nuevos no hay 04) y se dice en el README.

### 5. Construir el mockup HTML
Contrato en [`references/mockup-html.md`](references/mockup-html.md). Partir de
[`assets/mockup-base.html`](assets/mockup-base.html) → `<tmp>/template.html`:
tokens reales del proyecto en `:root` (citando archivo), textos por idioma espejo de las llaves,
una función por pantalla registrada en `SCREENS`, anotaciones numeradas igual que la lista de
cambios. Recursos del repo (banderas, logos) con `__ASSET:<ruta>__` y luego:
```bash
python scripts/build_mockup.py <tmp>/template.html --assets-root <repo frontend> --out "<salida>/Mockups <nombre>/Mockup <nombre>.html"
```

### 6. Capturas
```bash
python scripts/render_screens.py "<salida>/Mockups <nombre>/Mockup <nombre>.html" --out "<salida>/Mockups <nombre>/png"
```
Lista las pantallas e idiomas desde el propio mockup (`?list=1`). `--only s04,s09` para regenerar
solo las que cambiaron. **Abrir cada PNG** y revisar: nada encimado, textos que no se cortan,
badges que no tapan contenido, los dos idiomas.

### 7. Entregar
Resumen corto: carpeta, documentos, pantallas, cuántos cambios, pendientes abiertos (D-n) y
handoff a `/definir`. No pegar el contenido de los documentos en el chat.

### 8. Iterar
Cada respuesta del usuario sobre una decisión: actualizar el/los documentos que la citan, el
mockup y solo las capturas afectadas; agregar fila al Registro de cambios. Si una decisión
contradice algo ya escrito, buscarlo en **todos** los documentos (grep), no solo en el que se
está editando. Ediciones masivas con script de reemplazos que verifique (assert) que cada texto
original existía.

## Salida

```
<carpeta de salida>/                    ← p.ej. <RUTA_MOCKUPS>/<TKT>/
├── Contexto Backend <nombre>/          ← modo flujo, uno para todos los canales (references/flujo-backend.md)
│   ├── README.md
│   ├── 00 - Matriz de canales.md        ← solo con 2+ mockups (app, web…)
│   ├── 01 - Pantallas y flujo.md
│   ├── 02 - Acciones y operaciones.md
│   ├── 03 - Datos por pantalla.md
│   ├── 04 - Modelo de datos candidato.md
│   ├── 05 - Reglas y estados.md
│   ├── 06 - Decisiones y pendientes.md
│   ├── 07 - Contenido configurable.md   ← references/contenido-configurable.md
│   └── png/<canal>-original*.png        ← captura --full de cada mockup de diseño
├── Contexto Implementación <nombre> — <Canal>/   ← modos delta / nuevo, uno por canal (sin sufijo si hay uno solo)
│   ├── README.md                       ← propósito, reglas de oro, tabla de cambios, índice
│   ├── 01 - Cambios por pantalla.md
│   ├── 02 - Textos y localización.md
│   ├── 03 - Estilos y tokens.md
│   ├── 04 - Datos y APIs.md
│   ├── 05 - Checklist de implementación.md
│   └── 06 - Decisiones y pendientes.md
└── Mockups <nombre>/
    ├── Mockup <nombre>.html             ← interactivo: idiomas, con/sin anotaciones, ?only=sNN
    ├── README.md                        ← cómo abrirlo, lista de pantallas, cómo regenerar PNG
    └── png/<NN-nombre>-<lang>.png
```

## Checklist de cierre

Modo flujo: usar el checklist de [`references/flujo-backend.md`](references/flujo-backend.md) §7. Modos delta / nuevo:

- [ ] Cada pantalla del mockup tiene fila en 01 (existe / cambia / nueva) con `archivo:línea`.
- [ ] Cada estado relevante del código (vacío, cargando, error, parcial, rol, país) tiene fila, aunque el mockup no lo dibuje.
- [ ] Cada texto nuevo o cambiado está en 02 con **todos** los archivos de idioma.
- [ ] Cada color nuevo justifica por qué no sirve el token existente más cercano.
- [ ] Cada cifra en pantalla tiene campo, llamada y regla null/0 en 04.
- [ ] Lo que el mockup trae y no entra está en 06 §B.
- [ ] Ninguna decisión abierta sin pregunta concreta y recomendación.
- [ ] Mockup y PNG generados desde el HTML final; PNG revisados uno por uno en todos los idiomas.
- [ ] Ningún archivo del repo frontend modificado.

## Errores que ya pasaron (no repetir)

| Error | Prevención |
|---|---|
| Copiar la estructura del mockup aunque contradiga una regla ya decidida (título en la app bar) | Reglas de oro en la leyenda; dibujar con la regla y badge gris «sin cambio» |
| Documentar un campo de API «propuesto» cuando el back ya lo entregaba | Leer la revisión vigente del doc de APIs antes de escribir 04 |
| Proponer un filtro de servidor que la app hace en local | Leer cómo llama hoy el servicio/provider antes de proponer parámetros |
| Pintar una tarjeta en estados donde negocio no la quiere | Tabla de estados × bloques en 01; confirmar cada celda dudosa |
| Inferir marca/idioma/etiqueta por un solo ejemplo | Matriz de variantes explícita (país de la cuenta vs del objeto, idioma de la app) |
| Badges con posición absoluta que tapan el contenido | Badges en línea (`a(n)`) y resaltado `.hl` / `.hlT`; corner solo en tarjetas con margen |
| Selector CSS demasiado amplio (`.x div` en vez de `.x>div`) que infla espacios | Revisar el PNG, no solo el código |
| El usuario abre el template sin recursos incrustados («banderas rotas») | Entregar y abrir siempre el HTML que sale de `build_mockup.py` |
| Un reemplazo masivo con regex rompe texto (`U+00D7` → `D6`) | Reemplazos literales con assert, o regex con lookbehind; revisar el diff |
| Renumerar decisiones y romper enlaces entre documentos | Números estables; marcar «retirada» |
| (Flujo) Tomar un dato de ejemplo del mockup como regla («2 rechazos», «12 días») | Regla con evidencia del contexto o `(asumido)` + pregunta en 06 |
| (Flujo) Diseñar el DDL o el contrato final desde el mockup | Solo candidatos; el diseño final va en `design.md` con verificación MCP |
| (Flujo) Un endpoint por canal porque la app y la web «se ven distinto» | Matriz de canales: solo las diferencias de datos, entrada, alcance o regla tocan el contrato |
| (Flujo) Resolver en silencio una regla que difiere entre canales | Siempre decisión en 06; la regla se valida en el back sin importar el canal |
| (Flujo) Comparar el WinUI / ERP pantalla contra pantalla con la app y la web | El canal de administración se cruza contra entidades y estados (flujo-backend §4.5) |
| Release de la app **solo** por textos («Nivel → Meta», lema, hashtag) | Contenido de negocio en el catálogo del back; en el ARB solo el marco de UI (contenido-configurable §1) |
| (Flujo) Texto de negocio o error escrito dentro del SP; «15 días» escrito en el texto | Catálogo de textos con alcance + placeholders que resuelve el back |
| (Flujo) Olvidar quién administra lo que crean la app y la web | 00 §5–6: consultar, corregir, cambiar estado, configurar, auditar, lote, notificar — aunque no llegue mockup de admin |
