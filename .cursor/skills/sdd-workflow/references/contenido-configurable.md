# Estándar de contenido configurable

> **Estándar SDD-Nice para todo proyecto** (methodology.md regla 7 · guard `19_guard_contenido_configurable`).
> Copias idénticas en `sdd-toolkit/core/`, `sdd-workflow/references/` y `mockup-a-contexto/references/`;
> la CI verifica que no difieran.

En una app iOS + Android, publicar puede tardar **hasta 5 días** por la revisión de Apple; en web y
escritorio el costo es menor pero existe (deploy, ventana de cambio). Todo texto, mensaje, estatus,
etiqueta, tono o umbral que negocio pueda querer cambiar debe vivir en el **back** (catálogo o
parámetro), no en la app ni escrito dentro de un SP. Aplica a **cualquier** requerimiento con UI o
con mensajes al usuario, haya mockup o no.

Sale del análisis de un caso real con app + back (programa de afiliación por equipos, 17 revisiones
de contrato y ~40 deltas). Lo que funcionó y lo que costó están en §7.

## 1. Clasificar cada contenido (una fila por texto, etiqueta, estatus, color o número visible)

| Clase | Ejemplos | Dónde vive | ¿Cambiarlo requiere release? |
|---|---|---|---|
| **Marco de UI** | Títulos de pantalla, botones genéricos («Guardar», «Cancelar»), accesibilidad, textos de estados vacíos genéricos | ARB / i18n de la app | Sí, y está bien: cambia junto con el diseño |
| **Contenido de negocio** | Nombre del programa o campaña, lema, hashtag, nombres de rango, estatus, mensajes de recompensa, hints, avisos, motivos, nombres de periodo, nombre de país, etiqueta del ID (EIN/DIN) | **Catálogo de textos del back** con alcance (§2) | **No** |
| **Mensajes de error y validación** | «El EIN no existe», «Cupo lleno», «Ya rechazó dos veces» | **Catálogo de errores** del back: código + texto (§3) | **No** |
| **Reglas y números** | Días de ventana, máximo de rechazos, cupos, metas, umbrales de alerta | **Parámetro** por programa / país; el texto que lo menciona usa **placeholder** que resuelve el back (`{Days}`, `{MaxRejections}`) | **No** |
| **Presentación por estado** | Color del chip, ícono del estatus | El back manda **códigos semánticos** (`ColorTone`, `IconCode`) desde el catálogo; la app tiene una paleta cerrada con respaldo neutro | No, mientras el tono o ícono ya exista en la paleta; uno nuevo sí |
| **Interruptores** | Mostrar u ocultar el hashtag, una tarjeta, un bloque de campaña | **Feature flag** del back (por programa / país / plataforma) | **No** |
| **Lógica de pantalla** | Qué estado muestra qué bloque, orden de secciones | App, guiada por **banderas o códigos** del back (`HasMetas`, `IsPending`), nunca por el texto | Sí (es comportamiento) |

Regla de duda: **si negocio lo ha pedido cambiar alguna vez, o es de campaña, va al back.**

## 2. Catálogo de textos con alcance

En vez de un `CASE` con literales en cada SP:

| Columna | Para qué |
|---|---|
| `TextKey` | Llave estable en inglés UPPER_SNAKE (`HINT_COULD_REACH_GOAL_2`) |
| `MembershipProgramID` / `CountryID` | **Alcance**, ambos opcionales: programa → país → global |
| `TextES`, `TextEN` (o `LanguageCode` + `Text` si habrá más idiomas) | El texto, con placeholders `{Nombre}` |
| `IsActive`, `UpdatedBy`, `UpdatedAt` | Baja lógica y auditoría |

- **Resolución en el back:** se toma el texto del programa; si no hay, el del país; si no, el global. Si falta el EN, se usa el ES. Así la app recibe siempre un par completo.
- **Una función o SP de resolución** (`fnGetText(@Key, @ProgramID, @Lang, @Params)`) que usan todos los SP. Nunca un texto duplicado en dos bloques.
- **Los catálogos que ya existen** (rangos, estatus, recompensas) siguen igual, pero **los globales ganan alcance** cuando un país o programa necesita otro texto.
- **Los placeholders los resuelve el back**, con datos y parámetros (`{RequiredLevel}`, `{Days}`). Nunca se escribe en el texto un número que ya existe como parámetro.
- **Meses y periodos** salen del catálogo, no de `FORMAT(..., 'es')`, que depende de la cultura del servidor y solo cubre dos idiomas.

## 3. Catálogo de errores

| Regla | Por qué |
|---|---|
| **Un código por significado**, UPPER_SNAKE en inglés (`QUOTA_FULL`), nunca un mismo ID numérico para cuatro causas | La app decide lógica por código |
| Texto ES/EN desde el catálogo, con placeholders (`{Rank}`, `{Max}`) resueltos en el idioma correcto | Ninguna mezcla de idiomas dentro de un texto |
| **Todas** las escrituras responden igual: `ErrorCode`, `ErrorMessage`, `ErrorMessageEN` | Sin endpoints que solo traen ES o no traen código |
| Error inesperado → código genérico (`UNEXPECTED_ERROR`) + texto amable; el detalle técnico va al log, no a la respuesta | El usuario nunca ve texto técnico |
| La app guarda en ARB **solo** el respaldo genérico de error | Si el back cambia un mensaje, no hay release |

## 4. Contrato uniforme

| Tema | Regla única |
|---|---|
| Textos | Par `X` / `XEN` (o `X` + idioma pedido). **Mismo nombre del campo en todos los endpoints** para lo mismo (`StatusLabel`, no `Label` / `ConstanciaLabel` / `TeamStatus`) |
| Respaldo de idioma | Lo hace **el back** (EN vacío → ES). La app no cruza idiomas |
| Nulos en lectura | La llave **siempre viene**. `null` = «no se pinta». `0` se pinta. No se usa `""` |
| Nulos en escritura | Una regla para todo el API (p.ej. `null` = conserva, `""` = borra), documentada una vez |
| Códigos | Una convención: UPPER_SNAKE en inglés para estatus, motivos y errores. Los IDs numéricos solo sirven para relacionar |
| Tono e ícono | `ColorTone` / `IconCode` semánticos desde el catálogo de cada estatus; la app tiene la paleta y un respaldo neutro para lo desconocido |
| Fechas | ISO 8601: `yyyy-MM-dd` para fechas y `yyyy-MM-ddTHH:mm:ss` para fecha con hora, igual en todos los endpoints |
| Flags | Un endpoint de configuración (precedente: `GET /Config/ProductFeatureAccess`) con flags por programa, país y plataforma, más la **versión mínima de app** por plataforma |

## 5. Administración del contenido

Casi nunca hay una pantalla de administración (WinUI o ERP) para esto; se configura **según la necesidad**.
El mínimo que se diseña en el back:

- **Por cada catálogo:** `GET`, más un `POST` que **escriba ES y EN** (un contrato que acepta `*EN` y lo ignora es peor que no tenerlo), más auditoría.
- **Clonar programa:** un programa nuevo copia textos, reglas y parámetros del anterior del mismo país. Ningún programa nace vacío.
- **Revisión de completitud:** un SP o endpoint que liste, por programa e idioma, las llaves que faltan o que siguen con el valor de prueba. Se corre antes de activar el programa.
- **Scripts de carga:** idempotentes y con guardas (verificar el valor anterior). **Nunca** se re-ejecuta un script viejo que revierte textos ya cambiados; se parte de lo que hay en la base.
- **Cambio en caliente:** la app no guarda en caché textos de negocio más allá de la sesión, o los invalida al recargar. Así un cambio en la base se ve al volver a entrar, sin release.

## 6. Dónde se documenta

- **`spec.md`:** si el requerimiento muestra textos, estatus, mensajes o números de negocio, un CA dice qué
  debe poder cambiarse sin release (p.ej. «negocio cambia el texto del hint sin publicar la app»).
- **`design.md`:** sección **«Contenido configurable»** (plantilla de design) con el inventario de abajo,
  reducido a lo que toca el requerimiento.
- **Skill `mockup-a-contexto`, modo flujo:** documento `07 - Contenido configurable.md` con el inventario
  completo de todos los canales; en modo frontend, columna **Origen (ARB / API)** del documento 02.

Plantilla del inventario (la misma para los tres):

~~~markdown
## 1. Inventario de contenido (todos los canales)
| # | Contenido (texto / estatus / número / color) | Dónde se ve (canal · pantalla) | Clase (§1) | Fuente propuesta | Llave / campo | Alcance | Placeholders | Respaldo en la app |
|---|---|---|---|---|---|---|---|---|
| C1 | «NICE × TODOS» | app, web · encabezado | Negocio | `MembershipPrograms.MembershipProgramName/EN` | `MembershipProgramName` | programa | — | `programName` (ARB) |
| C2 | «Quedan más de 15 días…» | app · constancia | Negocio + regla | Catálogo de textos + parámetro `RiskDays` | `CONSTANCIA_AT_RISK` | programa | `{Days}` | — |
| C3 | Color del chip «En riesgo» | app, web | Presentación | `ConstanciaStatuses.ColorTone` | `ColorTone` | global → programa | — | tono 6 |

## 2. Catálogos y parámetros (nuevos o con cambios)
| Catálogo / parámetro | Columnas | Alcance | Endpoint de lectura | Endpoint de escritura | Clonado por programa |
|---|---|---|---|---|---|

## 3. Errores
| Código | Cuándo | Texto ES | Texto EN | Placeholders | Endpoints |
|---|---|---|---|---|---|

## 4. Flags
| Flag | Qué enciende | Alcance | Default |
|---|---|---|---|

## 5. Lo que queda en la app (marco de UI)
| Llave ARB | Por qué no va al back |
|---|---|
~~~

## 7. Evidencia: qué funcionó y qué costó (caso real)

| Funcionó | Costó |
|---|---|
| Catálogos con ES/EN (rangos, estatus, recompensas, constancia): «Nivel → Meta» se cambió en la base sin publicar la app | Textos dentro de los SP (hints, cuello de botella, motivos, errores): el mismo cambio obligó a modificar **4 SP** con guardas y diff byte a byte |
| `ColorTone` 1-6 en vez de colores hex | Umbrales en el código **y** escritos dentro del texto («15 días», «dos veces» aunque el máximo de rechazos era configurable) |
| `ErrorCode` + ES/EN para decidir y mostrar | Un mismo ID numérico para 3-4 causas; un endpoint sin código ni EN; errores inesperados con texto técnico |
| Push desde plantillas del back por país e idioma | Catálogos globales sin programa o país; nombres de país escritos dentro de los SP |
| Programa con nombre por país (Delta 75): la app salió con respaldo por llave y el back llegó después | Programas nuevos sin textos ni reglas; un `POST` que podía volver a escribir el texto viejo |
| La app sin cruzar idiomas cuando el back ya da el respaldo | Cuatro reglas de nulos distintas (`null`, `""`, llave ausente, respaldo en back o en app) y 6 convenciones de códigos |
| — | Lema, hashtag y textos de la campaña en el ARB: una release **solo de textos** |
