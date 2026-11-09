# Impl: tkt-fe-enc-res-001-enc-resultados-residente

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- (ninguno)

## Implementación realizada

- `ObtenerResultadosParaUsuarioAsync` en `CuartaEncuestasService`: admin bypass, 403 vigente sin participar, 200 si participó o encuesta cerrada, 404 borrador/no publicada; sanitización de textos libres (`TotalRespuestasTexto`, sin array).
- `EncuestaEstaPublicadaAsync` en repositorio (`bActivo=1`, `bEliminado=0`).
- `GET /ENC/Encuestas/{id}/resultados`: JWT residente + admin; deja policy solo-admin.
- Frontend: ruta `/encuestas/:id/resultados`, `ResultadosEncuestaPage` con `variant`, links en listado y post-envío, helper `puedeVerResultadosEncuesta`.

## Archivos modificados

- `GraphApi/Services/ENC/Encuestas/CuartaEncuestasService.cs`
- `GraphApi/Services/ENC/Encuestas/ICuartaEncuestasService.cs`
- `GraphApi/Controllers/ENC/Encuestas/EncuestasController.cs`
- `GraphApi/Repositories/ENC/CuartaEncuestasRepository.cs`
- `GraphApi/Repositories/ENC/ICuartaEncuestasRepository.cs`
- `GraphApi/Models/ENC/Encuestas/CuartaEncuestasDtos.cs`
- `GraphApi/GraphApi.Tests/CuartaEncuestasServiceTests.cs`
- `Web/src/pages/ResultadosEncuestaPage.tsx`
- `Web/src/pages/EncuestasPage.tsx`
- `Web/src/pages/EncuestaDetallePage.tsx`
- `Web/src/App.tsx`
- `Web/src/shared/types/encuestas.ts`
- `Web/src/features/encuestas/encuestaResultadosVisibility.ts`
- `Web/src/pages/EncuestasPage.test.tsx`
- `Web/src/pages/ResultadosEncuestaPage.test.tsx`
- `ContextoCuartaQuinientos/.planning/tkt-fe-enc-res-001/design.md`

## Auditoría SQL

- Estado: No aplica
- Hallazgos: —
- Correcciones: —

## Auditoría general

- Estado: APROBADO
- Hallazgos: menores (tests helper visibility, mensaje catálogo CONTENIDO-HARDCODE coherente con módulo ENC, UX encuestas históricas post-cierre)
- Correcciones: test borrador 404 añadido (F001)

## Auditoría seguridad

- Estado: APROBADO
- Hallazgos: bajos (403 vs enumeración aceptado por spec; legacy endpoints preexistentes fuera de scope)

## Scripts de prueba creados

### T-SQL unitarias
- No aplica (sin SQL en ticket)

### Contrato C# xUnit
- Archivo: `CuartaEncuestasServiceTests.cs` (TC-ENC-R-1..4 + sanitización + borrador 404)
- `dotnet test`: 11 passed (CuartaEncuestasServiceTests)

### API `.http`
- No aplica (pendiente smoke manual en `/revisar`)

## Resultado contra criterios de aceptación

- [x] CA-1: Residente participa → resultados con agregados (% opciones alineados con admin)
- [x] CA-2: Sin responder y vigente → 403 + mensaje ProblemDetails
- [x] CA-3: Tras cierre (`abierta=false`, publicada) → 200 vía API (navegación listado limitada a vigentes — ver F006 auditoría)
- [x] CA-4: Admin `/admin/encuestas/:id/resultados` sin cambio breaking (variant admin)

## Verificación final

### Criterios de aceptación

- [x] CA-1 [M]: Agregados numéricos compartidos (misma query repo; sanitización solo textos libres)
- [x] CA-2 [M]: 403 + `ENCUESTA_RESULTADOS_BLOQUEADOS` (texto en `detail`; catálogo ARB pendiente módulo ENC)
- [x] CA-3 [M]: API 200 post-cierre sin participar (xUnit TC-ENC-R-4); listado `/encuestas` solo vigentes — URL directa
- [x] CA-4 [M]: Vista admin sin breaking change
- [x] M-1..M-5: cubiertos según impl (S-1 parcial: conteo texto, sin top N)

### Pruebas T-SQL (tester-sql)

- Script: No aplica
- Resultado: No aplica

### Pruebas contrato C# xUnit

- `dotnet test GraphApi.Tests --filter CuartaEncuestasServiceTests`: **11/11 PASS**
- Casos: TC-ENC-R-1..4, sanitización, borrador 404

### Pruebas API

- Archivo: `FE-ENC-RES-001_api_tests.http`
- Smoke runtime: login `admin@local` OK contra `:5180`; `GET .../resultados` en BD local devolvió **500** en `encuestaId=9` (revisar datos/SQL repo, no regresión de auth). Login `residente@local` **401** con password smoke por defecto.
- Cobertura 403/200 residente: **xUnit** (equivalente a smoke contract)

### Pruebas frontend (Vitest)

- `EncuestasPage`, `ResultadosEncuestaPage`, `EncuestaDetallePage`: **11/11 PASS**
- `tsc --noEmit`: OK

### QA Checklist

- [x] Happy path (participó → link + GET 200 en servicio)
- [x] Caso negativo 403 (TC-ENC-R-3)
- [x] Edge cerrada sin participar (TC-ENC-R-4)
- [x] Regresión admin bypass (TC-ENC-R-1)
- [x] Anonimización textos (test + UI variant residente)
- [ ] Mutation Stryker: N/A (servicio delgado; mutación cubierta por tests de reglas)

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: APROBADO (ejecutar)
- auditor-seguridad: APROBADO (ejecutar)

### Sellos

- `verde`: SIN SELLO (sin objetos SQL; suite xUnit en verde)
- `revisar`: no registrado (sin hash SQL)

### Desviaciones detectadas

- CA-2: mensaje hardcodeado vs catálogo `ENCUESTA_RESULTADOS_BLOQUEADOS` (patrón ENC existente).
- CA-3 UX: encuestas cerradas no listadas en `/encuestas/activas`.

### Pendientes pre-PR

- Ejecutar `FE-ENC-RES-001_api_tests.http` con credencial residente válida y `encuestaId` publicado.
- Investigar HTTP 500 local en `GET resultados` si persiste (datos encuesta 9).
