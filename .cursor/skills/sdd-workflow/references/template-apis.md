# APIs — <Titulo del requerimiento> (`<modulo>`)

<!-- 
  PLANTILLA: TKT-<Numero>-APIS.md
  Guia para Front-end. Documentar UNICAMENTE APIs creadas o modificadas en el TKT.
  No incluir vistas, stored procedures ni objetos internos que Front no consume.
  Escribir como si Front no tuviera contexto previo del proyecto o ticket.
  Guardar en la misma ruta que spec.md / design.md (<RUTA_SPECS>/tkt-<id>/).
-->

Backend REST para <descripcion breve del modulo/funcionalidad>. El front NO habla con la base de datos; solo consume estos endpoints.

- **Base URL (TEST):** `http://<url-test>`
- **Ruta:** todos cuelgan de `/<Modulo>/...`
- En los **GET** los filtros van dentro del header `Parameters` (JSON); todos opcionales. Opcional `"ColumnNames":"col1,col2"` para acotar columnas.
- En **POST/DELETE (procesos)** revisar `ErrorID` de cada fila de `data` (0 = OK; si falla, `ErrorMessage` en espanol).

---

<!--
  SECCION POR CADA ENDPOINT (repetir bloque por cada API creada/modificada).
  Agrupar por dominio logico (Configuracion, Operacion, Consultas, etc.).
  Ordenar dentro de cada grupo: GET → POST → DELETE.

  HAY DOS VARIANTES de documentacion por recurso:
  A) CRUD estándar (GET + POST + DELETE en tabla) — usar para recursos con multiples verbos.
  B) Acción única (un solo verbo, heading con verbo, body + response inline) — usar para
     endpoints de proceso/accion que no son CRUD (ej: InvitationResponse, InvitationResend).
-->

## 1. <Grupo logico> (ej: Configuracion, Operacion, Consultas)

### Variante A — CRUD estandar (multiples verbos)

### 1.1 `<NombreRecurso>` — <Descripcion breve de que es/para que sirve>

<!--
  Para CADA recurso, listar SOLO los verbos implementados.
  Si el recurso expone GET + POST + DELETE, documentar los 3.
  Si solo expone GET, documentar solo GET.
-->

| Verbo | Ruta | Para que |
|---|---|---|
| GET | `/<Modulo>/<Recurso>` | <Que devuelve y filtros disponibles: NombreFiltro1, NombreFiltro2, ...> |
| POST | `/<Modulo>/<Recurso>` | <Que hace: crear/actualizar/ejecutar proceso>. |
| DELETE | `/<Modulo>/<Recurso>/{<RecursoID>}` | <Que hace: baja logica, cancelar, etc.> |

Body POST:
```json
{ "<RecursoID>":0, "<Campo1>":"valor", "<Campo2>":1, "<CampoFecha>":"2026-01-01", "<CampoBool>":true }
```

Response (ejemplo GET):
```json
{
  "data": [
    { "<RecursoID>":1, "<Campo1>":"valor real", "<Campo2>":5, "<CampoBool>":true }
  ]
}
```

<!--
  H2: Si el recurso es un CATALOGO (valores finitos que Front usa para poblar selects,
  etiquetas o filtros), incluir los valores base despues del response.
-->

Valores base: `1`=<Valor1>, `2`=<Valor2>, `3`=<Valor3>.

> <Notas importantes para Front: validaciones, comportamiento especial, campos calculados, etc.>

<!--
  H4: Si la respuesta tiene estructura atipica, agregar nota de consumo.
  Ejemplos de estructura atipica:
  - FOR JSON anidado: el JSON llega como texto dentro de data[0] bajo una clave tipo JSON_F52E2B61-...
  - Paginacion custom
  - Respuesta con sub-objetos anidados
  - Campos que requieren doble parseo
-->

> ⚠️ **Nota de consumo** (incluir solo si aplica): <explicar como parsear la respuesta si no es el arreglo plano estandar de `data`. Ej: "por venir de un FOR JSON del SP, el JSON llega anidado como texto dentro de `data[0]` bajo una clave tipo `JSON_F52E2B61-...`. Hay que leer esa primera propiedad de `data[0]` y volver a parsearla.">

---

### Variante B — Accion unica (un solo verbo, no es CRUD)

<!--
  Usar para endpoints de proceso/accion que exponen un solo verbo y no encajan
  en tabla CRUD. Ej: InvitationValidateHash (GET), InvitationResponse (POST),
  InvitationResend (POST).
-->

### 1.N `<NombreRecurso>` — <Descripcion breve> → **<VERBO>**
`/<Modulo>/<Recurso>` · Header `Parameters`: `{ "<Filtro>":"<valor>" }`

<Descripcion funcional completa: que valida, que devuelve, cuando es accionable, etc.>

Body (si POST):
```json
{ "<Campo1>":"<valor>", "<Campo2>":"<valor>" }
```

- `<Campo1>`: <valores posibles y su significado>.
- Al **<accion positiva>**: <que pasa internamente y que devuelve>.
- `data.<campo_resultado>`: `<Valor1>`, `<Valor2>`, o `Error` (con `ErrorID`/`ErrorMessage`).

> ⚠️ **Nota de consumo** (incluir solo si aplica): <gotchas de parseo>.

---

## N. Resumen de endpoints

| # | Recurso | GET | POST | DELETE |
|---|---|:--:|:--:|:--:|
| 1 | <Recurso1> | ✔ <breve> | ✔ <breve> | ✔ /{id} |
| 2 | <Recurso2> | ✔ | — | — |

<!--
  Notas finales: endpoints externos reutilizados que Front necesita pero no estan
  en este modulo (ej: POST /Customer/CustomerNameMultiple para buscar EIN).
-->

> <Busqueda de X por Y: se reutiliza el endpoint existente `POST /OtroModulo/OtroRecurso` (no esta en este modulo).>
