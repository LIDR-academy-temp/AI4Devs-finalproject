# Profile: database — SQL Server (T-SQL)

> Convenciones de datos. Editar por proyecto. Este es el perfil de NICE/Nesgo.

## Esquemas de dominio

| Esquema | Dominio |
|---------|---------|
| `sls` | Ventas / Órdenes |
| `cst` | Clientes / CRM |
| `pre` | Promociones |
| `wms` | Warehouse Management |
| `wrh` | Almacenes |
| `itm` | Artículos / SKUs |
| `gpm` | Goal Programs |
| `eve` | Calificaciones / Eventos |
| `wlt` | Wallet / Pagos |

> Además existen esquemas de **contexto** en PascalCase (legado válido, no replicar
> el estilo en dominios nuevos): `CommissionsContext`, `CustomServiceContext`,
> `ExigoWebContext`, `PromoEngine`, `Coupons`. Verificar la existencia real vía MCP.

## Naming obligatorio

- Tablas: `esquema.NombreEnUpperCamelCase` (singular)
- Vistas: `esquema.vsNombreDescriptivo`
- SPs: `esquema.prcGetNombre`, `esquema.prcSetNombre`, `esquema.prcDelNombre`
- Funciones: `esquema.fncGetNombre`
- PK: `pk_esquema_Tabla`

## Prefijos de variables T-SQL

- `@i` int · `@nv` nvarchar · `@dt` datetime · `@b` bit · `@tbl` table
- Parámetros de SP: `@iPParametro`, `@nvPParametro`

## Campos obligatorios en tablas nuevas

Canónico en **inglés**: `CreatedBy`, `ModifiedBy`, `CreatedUserID`,
`ModifiedUserID`, `CreatedDate`, `ModifiedDate`.
La variante en español (`CreadoPor`, `FechaCreacion`…) existe solo en tablas
legado; no usarla en tablas nuevas.

## Instancia `NiceReporting` (reportes y catálogos)

Comparte este profile. Esquemas propios además de los de dominio:
`logs`, `queue`, `sync`, `upload`, `cache` (más los esquemas de contexto).
Rol: reportes y catálogos — normalmente lectura/agregación, no transaccional.

## Escalera de decisión (T-SQL — aterriza methodology.md regla 6)

> No redefine la escalera; aterriza sus peldaños 2-4 al motor. El orden y la
> definición viven en `methodology.md` (regla 6).

- **Peldaño 2 (nativo del motor):** ¿lo resuelve una feature de SQL Server sin
  objeto nuevo? — vista/función del esquema de dominio ya existente, computed
  column, índice/constraint, `MERGE`, funciones de ventana, JSON nativo.
  Preferir antes de crear un SP.
- **Peldaño 3 (reuso):** ¿existe ya un `prcGet/prcSet/prcDel`, `vs*` o `fnc*` en
  el esquema de dominio (`sls/cst/pre/itm/eve/wlt/gpm/wms/wrh`) que lo cubra?
  Verificar existencia **real en la BD** (vía MCP / `13_guard_fuente_objetos`),
  nunca asumir desde un `.md`. Patrón de investigación (tres pasos, sin
  herramienta adicional para los dos primeros):
  1. **Existencia** — `search_objects` del MCP de BD (`object_type:
     procedure` o `view`, `schema:` del dominio, `pattern:` del nombre
     probable) para confirmar si ya existe algo parecido antes de asumir que
     hay que crear.
  2. **Dependencias puntuales** — si el objeto candidato existe pero no se
     sabe qué lo usa (¿modificarlo rompe algo?), consultar
     `sys.sql_expression_dependencies` vía el MCP de ejecución SQL
     (`referencing_entity_name` / `referenced_entity_name`) para ver quién lo
     llama antes de tocarlo.
  3. **Red completa (SQL + endpoints que lo llaman)** — si 1-2 no alcanzan
     porque hace falta ver TODA la cadena de dependencias, no solo un punto:
     `python sdd-toolkit/tools/code_graph.py --query "<esquema.objeto>"`.
     No se actualiza solo — regenerar con `--target all` si no está fresco
     (ver `/sincronizar`).
- **Peldaño 4 (cambio mínimo):** ¿basta agregar un parámetro o una rama a un SP
  existente respetando su firma e invariantes? Preferir sobre crear un SP nuevo.
  Si un invariante estorba → escalar, no reescribir.
- **Peldaño 5:** SP/vista/función/tabla nueva solo si fallaron 1-4, con el
  naming y los campos obligatorios de este profile.

## Ambientes y ejecución

- `@iPIEnvironment = 666` TEST · `1` PROD
- `@bPExecute = 0` dry-run · `1` ejecutar

## Plan de pruebas esperado en design.md

- T-SQL unitarias (casos borde, dry-run vs execute).
- Estrategia de rollback explícita.

## Pitfalls comunes (T-SQL / SQL Server)

- **Falso positivo en reuso (peldaño 3):** `search_objects` devuelve SP con nombre similar pero de esquema distinto — verificar esquema exacto antes de declarar "ya existe".
- **SP sin `SET NOCOUNT ON`:** produce resultados de filas intermedias que rompen `SqlCnxLibrary.executeQuery()`. Obligatorio en todo SP nuevo.
- **Cursor T-SQL en lugar de set-based:** degradación severa en volumen > 1 000 filas — proponer alternativa set-based.
- **Hardcodeo de ambiente:** no hardcodear `666` ni `1` en lógica de SP — recibirlos como `@iPIEnvironment`.
- **JOIN sin índice verificado:** todo JOIN en tabla > 100k filas requiere confirmar índice existente vía MCP antes de incluir en design.md.
- **MCP timeout en SPs de reporte:** si `EXEC` del SP supera 60 s en MCP, el test aparece como Pending — eso **no es Failed**. Verificación alternativa aceptable: (1) `OBJECT_DEFINITION(OBJECT_ID('esquema.SP'))` para confirmar que la lógica prescrita está presente; (2) SELECT acotado contra tabla de staging o `#Cand` con los predicados del SP. Documentar en `impl.md`/`delta.md` como "verificación alternativa — EXEC timeout MCP". Benchmark real → ejecutar en SSMS/sqlcmd fuera de MCP.
- **INSERT…EXEC anidado en tests:** no anidar `INSERT…EXEC` dentro del batch `#TestResults` — SQL Server lo rechaza. Crear `#temp` destino con columnas NULL explícitas antes del INSERT…EXEC (no `SELECT INTO` desde staging NOT NULL). E2E con INSERT…EXEC → separar en `_debug_tc*.sql` fuera del batch principal.
- **Objeto nuevo en esquema de contexto legado:** `ExigoWebContext`, `CommissionsContext`, etc. son legado — todo objeto nuevo va en su esquema de dominio (`sls/cst/pre/…`).

## Build order default (T-SQL)

Para requerimientos que crean o modifican objetos SQL. Ajustar según scope real del requerimiento.

| # | Paso | Entregable | Dependencia |
|---|------|-----------|-------------|
| 1 | Verificar objetos existentes vía MCP (`search_objects` + `sys.sql_expression_dependencies`) | Lista de objetos confirmados | — |
| 2 | Crear/modificar tablas o columnas | DDL ejecutado | 1 |
| 3 | Crear/modificar índices | Índices confirmados | 2 |
| 4 | Crear/modificar SPs `prcGet*` | SP compilado y verificado MCP | 2–3 |
| 5 | Crear/modificar SPs `prcSet*` / `prcDel*` | SP compilado y verificado MCP | 4 |
| 6 | Crear/modificar vistas (`vs*`) o funciones (`fnc*`) si aplica | Objeto compilado | 4 |
| 7 | Smoke test: ejecutar cada SP con datos reales vía MCP test | Resultado `-- ✓ MCP` anotado | 4–6 |

## Contenido configurable (T-SQL — aterriza methodology.md regla 7)

> Estándar completo: `core/contenido-configurable.md`. Guard `19_guard_contenido_configurable`.

- Textos de negocio y errores salen de un **catálogo de textos con alcance** (programa → país → global) vía
  una función de resolución; ningún `CASE … THEN N'texto'` ni `SET @msg = N'…'` de negocio dentro de un SP,
  y nunca el mismo texto en dos bloques.
- Catálogos nuevos: columnas ES/EN (o `LanguageCode` + texto), `IsActive`, campos de auditoría y columna de
  alcance (`CountryID` / programa) aunque hoy se use global.
- Números de regla (días, máximos, cupos, umbrales, ventanas) como **columnas de parámetro** del programa o
  país; nunca constantes en el SP ni escritos dentro del texto. El texto usa `{Placeholder}` y el SP lo resuelve.
- Decidir por ID, código o bandera; nunca por el texto de un catálogo (`[Rank] = N'…'`).
- Etiquetas de mes o periodo desde el catálogo, no con `FORMAT(..., 'es')`.
- Errores: un `ErrorCode` por significado (UPPER_SNAKE), con ES y EN desde el catálogo; el detalle técnico al log.
- Scripts de carga de textos: idempotentes, con guarda del valor anterior; nunca re-ejecutar uno viejo que
  revierte textos ya cambiados.

## Learnings (acumulado)

> Append automático en Cierre ARCHIVADO (CLAUDE.md — Compound Loop).
> No editar manualmente; solo Claude escribe aquí al cerrar un TKT.

| TKT | Fecha cierre | Aprendizaje |
|-----|-------------|-------------|
| TKTUS-15 | 2026-09-28 | Un CAST solo en las ramas literales del CASE deja numeric(38,15). El CAST AS DECIMAL(10,2) tiene que envolver el CASE completo. |

## Decisiones (ADR)

> Append automático en Cierre ARCHIVADO (CLAUDE.md — Compound Loop).
> No editar manualmente; solo Claude escribe aquí al cerrar un TKT.
| TKT-4-ADDON-3 | 2026-09-25 | `#Front` de NetworkRank tiene PK `(CandidateID, FrontID)`. El `SUM` de cheques va con semi-join `CustomerID IN (SELECT FrontID FROM #Front)`, no con `INNER JOIN #Front`. |

### Ganancias de red desde cheques

**Target**: database

- Decisión: `Front_EarningsPrior` y `Front_EarningsPriorPrior` leen `dfr.vsChecks` (vigente, USD, P-1 y P-2).
- Alternativa descartada: seguir en `CommissionRuns` / `vsCommissionDetail`.
- Motivo: el reporte pide ganancias de cheque de los dos periodos previos, no la comisión del run activo. El SP de avance de venta no entra en ese cambio.
| TKT-4-ADDON-4 | 2026-09-25 | `jsonstring=1` exige la columna `JSON_F52E2B61-18A1-11d1-B105-00805F49916B`. `FOR JSON` en el SELECT final impide `INSERT EXEC`: asignar el JSON a una variable y seleccionarla con ese alias. |

### Agregado anidado en un solo JSON
**Target**: database
**Decisión**: `PeriodID` + `NBDDs[]` con arreglos hijos. Nodo vacío = `null`.
**Alternativa**: forma larga `DimensionCode` (`GROUPING SETS`).
**Motivo**: el consumidor pidió el árbol por Directora, no filas planas.

### CAST envolvente en el crecimiento

**Target**: database

- Decisión: un solo `CAST` alrededor de todo el `CASE`.
- Alternativa descartada: `CAST` solo en las ramas `0` y `100`, y `ROUND` en el `ELSE`.
- Motivo: SQL Server toma la precisión más ancha de las ramas. Sin el `CAST` envolvente el tipo queda `numeric(38,15)`. TKTUS-15, 2026-09-28.
