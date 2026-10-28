---
name: documentar-sp
description: Documenta la lógica de negocio de un Stored Procedure grande (miles de líneas, muchos TKTs superpuestos) en un .md de lectura rápida. Usar cuando el usuario pide "documentar la lógica del SP", "mapa del SP", entender/mantener un procedimiento monolítico, o actualizar un doc de lógica existente.
metadata:
  trigger: "documentar SP, lógica del SP, mapa del SP, entender procedimiento, LOGICA_PROCESO, timeline, prcGet, SP monolítico, actualizar doc lógica"
---

# Documentar la lógica de un SP grande

Rol: convierto un SP monolítico (miles de líneas, decenas de TKTs superpuestos)
en un `.md` de lectura rápida que sobrevive a cambios de código y sirve para
mantener, no para reescribir el SP.

> **Config:** lee `sdd.config.yaml` → `vars` (`MCP_TEST`, `MCP_PROD`). Sustituye cada
> `<KEY>` con `vars.KEY`. Disparo automático: hook `.claude/hooks/documentar-sp-trigger.ps1`
> (UserPromptSubmit) cuando el prompt pide documentar/mapa/lógica de un SP.

Ejemplo real del método (NICE): `Sales/AvanceExpress/LOGICA_PROCESO_EXPRESSSTART.md`
(mapa de `sls.prcGetExpressStartTimeline`, ~9 574 líneas).

## Regla de oro (aprendida a golpes)

**El doc no es la fuente de verdad; el código sí.** El doc es un índice navegable.
Todo lo que se afirme se ancla en un marcador estable del código y se verifica
contra el código actual antes de escribirlo. Los números de línea se mueven —
son referencia orientativa, nunca el ancla.

## Estructura obligatoria del doc

En este orden (adaptar títulos al dominio, no omitir secciones):

1. **Encabezado**: archivo fuente + nº de líneas + fecha de última actualización del doc.
2. **Índice** con anclas a cada sección (el SP crece; el índice es el mapa).
3. **Firma y parámetros de entrada**: tabla `Campo JSON → variable interna → descripción`. Marca los que NO vienen del JSON y se computan internamente.
4. **Variables principales**: agrupadas por rol (estado del cliente, config, flags/fechas, dual-path, etc.). Tipo + descripción + de dónde sale el valor.
5. **Tablas temporales y variables de tabla**: qué guarda cada una y quién la llena.
6. **Inicialización**: OPENJSON, resolución de periodo/cliente/entorno.
7. **Flujo general y motor del loop**: el corazón algorítmico primero, aislado del ruido de TKTs.
8. **Secciones por bloque funcional** siguiendo el orden de ejecución real del SP.
9. **TKT Index — reglas de negocio por ticket**: una entrada por TKT que toca el SP, anclada en su marcador. Esta es la sección más consultada.
10. **Casos reales documentados**: entradas concretas (EIN/ID + periodo) con resultado esperado, por capa/bug. Indica entorno (test vs PROD).
11. **Mapa de uso de <concepto crítico>**: lista de TODOS los sitios donde se usa una variable/cálculo peligroso (ver "Cobertura total").

## Cómo anclar (no negociable)

- Ancla en marcadores de código estables: comentarios `-- TKT-XXXX`, nombres de
  `REGION`/etiqueta de `GOTO`, nombres de tabla temporal, nombres de bloque
  (`BLOQUE 02-01`). NUNCA en números de línea como ancla único.
- Si el SP no tiene marcadores en un punto clave, propón al usuario agregar un
  comentario-ancla estable antes de documentar ahí.
- Al citar líneas, escríbelas como "~1171" (aproximado) y acompaña siempre del marcador.

## Método de trabajo

0. **Fuente de la definición.** Usa primero el archivo `.sql` canónico en el repo
   (es la copia versionada y sí muestra comentarios). Como respaldo, léela del
   entorno que la expone: normalmente `<MCP_TEST>` puede leer el código
   (`OBJECT_DEFINITION` / `search_objects`); `<MCP_PROD>` puede NO tenerlo (login sin
   VIEW DEFINITION — en NICE `nesgoPROD` no lo tiene). Los DATOS de casos se validan al revés (ver Trampas).
1. **No leas 9000 líneas de corrido — arma primero el esqueleto.** Con Grep sobre
   el `.sql` extrae los marcadores y construye el índice antes de leer a detalle:
   `CREATE PROCEDURE`, `-- TKT`, `REGION`/`ENDREGION`, etiquetas de `GOTO:`,
   `DECLARE @` de tablas y `#`/`@tmp` temporales, y los `-- SALIDA`/`SELECT` de
   salida. Luego lee cada bloque puntualmente (Read con offset), no entero.
2. **Si el doc ya existe: actualización incremental.** Léelo, ubica cada sección
   por su marcador (no por línea), verifica contra el código actual y corrige solo
   lo que se movió o cambió. Refresca el índice y la fecha. No reescribas de cero.
3. **Recorre el SP en orden de ejecución**, no por número de línea ascendente
   ciego: sigue los GOTOs y loops (el orden físico ≠ orden de ejecución).
4. **Una entrada de TKT = qué regla impone + dónde (marcador) + por qué**. No
   narres el diff; documenta la regla de negocio resultante.
5. **Cobertura total de conceptos peligrosos.** Cuando una variable/cálculo se usa
   en muchos sitios (p. ej. el Group PV se usaba en loop, dual-path, overrides y
   cierres), enumera TODOS los sitios en un "Mapa de uso". Para encontrarlos:
   Grep del nombre exacto de la variable (`@iGroupPV`) sobre el `.sql`. Documentar
   solo uno desincroniza el análisis y esconde bugs.
6. **Marca los side-effects.** Identifica qué ramas ESCRIBEN (a Exigo, cupones,
   tablas persistidas) y bajo qué flag de dry-run/ejecución (p. ej. `@bPExecute`,
   `@bPIsTest`, `ReconcileOverrides`). En cada bloque que escribe, anota el flag
   que lo gatea y el riesgo económico. Es lo primero que consulta quien mantiene.
7. **Valida adversarialmente** las reglas críticas: busca el caso que rompe tu
   afirmación. Muchas reglas tienen varias capas y ninguna sola las explica.
8. Al terminar o actualizar, **actualiza la fecha del encabezado** y el índice.

## Trampas de validación (errores que ya cometimos)

- **Datos no deterministas en test.** Algunos valores se recargan desde una API
  externa (p. ej. Exigo) en cada ejecución → tres corridas, tres valores. No confíes en
  ellos vía test en vivo; valida con modo batch (datos precargados) o contra PROD.
- **El catálogo/config difiere entre test y PROD.** Un mismo ID puede tener rango
  o tipo distinto en cada entorno. Fija el caso en el entorno donde la regla
  aplica y anótalo explícitamente ("2045018: rank 30 en PROD, rank 20 en test —
  usar PROD").
- **Vista distinta ≠ dato distinto.** El mismo número puede mostrarse neto en un
  lado y bruto/acumulado en otro. Aclara qué vista documenta cada sección antes
  de reportar una discrepancia como bug.
- **Reglas que solo viven en un entorno.** Alguna config de negocio puede existir
  solo en PROD; verifícalo antes de concluir "no aplica".

## Formato de archivo

- El `.md` va en la misma carpeta del `.sql` fuente (junto al SP), salvo que el
  usuario indique otra ruta.
- **Encoding: UTF-8 con BOM + CRLF.** Write/Edit no lo agregan; genera/guarda con
  PowerShell (`System.IO.File`) o verifica el BOM tras escribir.

## Al terminar

Entrega el path del doc y un resumen de una línea de qué secciones agregaste o
actualizaste. Si el usuario mantiene memoria del SP, ofrece actualizar la nota
de índice del doc.
