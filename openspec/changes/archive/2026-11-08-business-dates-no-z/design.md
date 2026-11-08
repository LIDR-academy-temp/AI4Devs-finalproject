## Context

- **Cómo se guardan:** las fechas de negocio están en `DATETIME2` sin zona y son hora de pared de Nueva York. Prisma las lee como `Date` cuyos dígitos UTC son los guardados, y hoy 7 sitios las serializan con `toISOString()`, que añade `.000Z`:
  - `import-service.ts:821` (`transactionDate`);
  - `validation-service.ts:217` (rangos);
  - `prisma-validation-run-repository.ts:902` y su fake `__fakes__/in-memory-runs.ts:585` (`relevantDate`);
  - `settlement-service.ts:95` (`dateRanges`);
  - `prisma-settlement-reader.ts:21` y `prisma-settlement-queries.ts:34` (movimientos y fees aplicados).
- **Validación de respuestas:** `fastify-type-provider-zod` valida cada respuesta con su `serializerCompiler`. Hoy los 7 campos usan `IsoDateTime`, que acepta la `Z`.
- **Lectores del formato:**
  - `frontend/src/lib/format.ts` formatea las fechas de negocio con `Intl` en zona UTC, y así no las mueve;
  - `backend/src/modules/settlement/domain/exports/business-time.ts` hace `new Date(value).toISOString()` para el CSV.
  - Sin `Z`, los dos pasarían a leer en la zona del navegador o del servidor.
- **Desde el análisis del #48 (`b4445e0`), en `feature/entrega-3-MVP` han llegado:**
  - `e2e-user-stories`, que compara la tabla de rangos de la pantalla de validaciones con `^<día> \d{2}:\d{2} \S+ – <día> \d{2}:\d{2} \S+$` (`e2e/steps/validations.steps.ts:84-93`);
  - `deploy-hardening`, que no toca fechas.
  - Ningún archivo de `packages/shared`, de `backend/src` con fechas ni de `frontend/src` ha cambiado: los números de línea de arriba siguen valiendo.

## Goals / Non-Goals

**Goals:**
- El API dice lo que guarda: hora de Nueva York, sin una zona falsa.
- Lo que se ve en pantalla y en los CSV no cambia en ningún carácter, en ninguna zona de navegador ni de servidor.

**Non-Goals:**
- Guardar las fechas con zona o en UTC, o tocar el esquema de la base.
- Cambiar los instantes de auditoría, las columnas de solo día o las peticiones.
- Mostrar segundos o cambiar el sufijo `ET`.

## Decisions

### D1. Formato `YYYY-MM-DDTHH:mm:ss`, sin zona ni milisegundos

Por ejemplo, `"2026-10-24T13:05:00"`.
- El seed genera segundos enteros y ninguna pantalla muestra menos que el minuto.
- Las fracciones de segundo, si las hubiera, se truncan al serializar. El valor guardado no cambia.
- **Alternativas descartadas:**
  - Con milisegundos (`.000`): no aportan nada y alargan cada fecha.
  - Con offset (`-04:00`): obligaría a calcular el horario de verano en el backend para cada fecha y es otra forma de decir "instante".

### D2. `BusinessDateTime` en `packages/shared/src/vocabulary.ts`

```ts
z.iso.datetime({ local: true, precision: 0 }).regex(/^[^Z]+$/, 'New York wall time without a zone expected')
```

Probado con Zod 4.6.7:
- `local: true` acepta también la `Z`, y el `.regex` la rechaza.
- `precision: 0` rechaza `.000` y una hora sin segundos.
- Rechaza `2026-02-30`.
- En el JSON Schema sale como dos `pattern` en `allOf`.

Se usa en los 7 campos: `ImportRowTransaction.transactionDate`, `DateRangeView`, `ValidationIssue.relevantDate`, `BatchDateRange`, `SettlementMovement.eventDate` y `expectedReserveReleaseAt`, y `AppliedFee.eventDate`.

### D3. Backend: `businessDateTime(value: Date): string`

- Va en `backend/src/shared/` y devuelve `value.toISOString().slice(0, 19)`. Los dígitos UTC del `Date` de Prisma son los guardados, así que no depende de `TZ`.
- Se usa en los 7 sitios; la auditoría sigue con `toISOString()`.
- **Red de seguridad:** el `serializerCompiler` valida cada respuesta. Un sitio olvidado da `500` en su prueba de ruta o de integración.
- **Alternativa descartada:** un serializador global por nombre de campo. Es frágil: el mismo nombre podría ser un instante en otro módulo, y esconde la decisión.

### D4. CSV: `businessTime` lee los dígitos, sin `new Date`

- Pasa de `"2026-10-07T23:58:40"` a `"2026-10-07 23:58:40"` cortando el texto. La salida no cambia.
- Su prueba cubre un proceso con `TZ` distinta de UTC.

### D5. Frontend: formateo sin `Date` ni `Intl`

- `formatBusinessDate` y `formatBusinessDateTime` parten el texto (`YYYY-MM-DD` y `HH:mm`) y mantienen la salida de hoy: `2026-09-28` y `2026-09-28 00:04 ET`.
- **Salida idéntica, carácter a carácter:** la suite E2E compara la tabla de rangos con `<día> HH:MM <zona>` (Context). Mantenerla así mantiene verde esa comparación, que pasa a servir de red: si el formato se rompe, falla el job `e2e` de la CI.
- Las fechas de auditoría siguen con `Intl` en `America/New_York`.
- `format.test.ts` añade una prueba con el proceso en otra zona.
- Las fixtures de fechas de negocio de MSW y de las pruebas de componentes pasan al formato nuevo. Si una fixture se olvida, la prueba de componente sigue pasando, porque el corte del texto da lo mismo. Las pruebas de contrato de MSW (`frontend/src/test/msw/*.test.ts`) parsean las respuestas con los esquemas de `packages/shared`, así que una fixture con `Z` falla allí con `BusinessDateTime`. Para las fixtures escritas a mano en las pruebas de componentes queda un `grep` antes de cerrar (Risks).
- El comentario de cabecera de las fechas y el tipo `BusinessDate` dejan de mencionar la `Z` y el #48.

### D6. Bruno

- Aserción `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$` en dos peticiones: `20-flows/settlements/batch-clean/4 Run validations.bru` (`ranges`, con `runAt` en `Z`) y `20-flows/settlements/batch-clean/13 Transactions I.bru` (`eventDate`).
- Ninguna aserción actual compara fechas de negocio.

### D7. Comprobación

- **Test primero, con rotura deliberada:**
  - las pruebas de `BusinessDateTime`, de `businessDateTime`, de `businessTime` con otra `TZ` y de `format.ts` con otra zona se escriben antes del código y se ven en rojo;
  - una de ellas se rompe a propósito una vez para ver que falla por la razón correcta.
- **Unitarias y de rutas:** en local.
- **Integración, Bruno y E2E:** en la CI de la rama. No hace falta base local.
- **Rotura del `serializerCompiler` en la CI:**
  - un commit temporal devuelve un sitio a `toISOString()`;
  - su prueba de integración tiene que dar `500`;
  - se revierte con `git revert`, y los dos commits se quedan en el historial.

## Risks / Trade-offs

- **[Cliente externo que espere la `Z`]** → Hoy no hay ninguno: el único cliente es el frontend del monorepo, que cambia en el mismo PR. Se marca **BREAKING** en el proposal y en la descripción del PR.
- **[Un sitio olvidado]** → El `serializerCompiler` lo convierte en `500` en la prueba que cubre su ruta (D3), y la rotura deliberada (D7) comprueba que esa red funciona.
- **[Una fixture de frontend olvidada con `Z`]** → El formateo por corte da el mismo resultado, así que no rompe nada visible. Se buscan con `grep` las fechas de negocio con `Z` en `frontend/src/test` y en las pruebas de validations y settlements antes de cerrar.
- **[Corte del domingo]** → Si el domingo por la noche no está fusionado, el change vuelve a roadmap y el #48 sigue abierto. El trabajo queda en la rama.

## Migration Plan

- Sin migraciones de base. El despliegue es el normal de `docs/deploy.md` §11 (`build`, `migrate`, que no aplicará ninguna, y `up --wait`).
- Backend y frontend van en las mismas imágenes del mismo PR, así que no hay ventana con un frontend antiguo leyendo el formato nuevo, salvo una pestaña abierta durante el reinicio. En esa pestaña, el formateo antiguo lee la fecha sin `Z` como hora local del navegador, así que la fecha se desplaza hasta que se recargue.
- **Volver atrás:** revertir el merge. Ningún dato cambia.
