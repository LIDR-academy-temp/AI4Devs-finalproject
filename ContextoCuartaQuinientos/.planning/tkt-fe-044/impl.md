[← index](_index.md) | [← design](design.md)

# Impl: FE-044

## Implementación

UI Encuestas completa: páginas residente (lista + detalle/formulario + resultados) y administrador (lista + crear), hooks de datos, tipos compartidos y rutas registradas.

## Archivos creados

```
Web/src/
  pages/
    EncuestasPage.tsx              [NUEVO] Lista encuestas activas (residente)
    EncuestaDetallePage.tsx        [NUEVO] Formulario de respuesta por encuesta
    ResultadosEncuestaPage.tsx     [NUEVO] Resultados agregados (admin)
    AdminEncuestasPage.tsx         [NUEVO] Gestión encuestas admin + modal crear
    AdminEncuestasPage.test.tsx    [NUEVO] Test unitario AdminEncuestasPage (vitest)

  features/encuestas/
    useEncuestasActivas.ts         [NUEVO] Hook GET /ENC/Encuestas/activas

  features/admin/encuestas/
    useEncuestasAdmin.ts           [NUEVO] Hook GET /ENC/Encuestas (admin)

  shared/types/
    encuestas.ts                   [NUEVO] Tipos TS: EncuestaListItem, EncuestaDetalle,
                                           EncuestaResultados, EncuestaCrearRequest, etc.
```

## Archivos modificados

```
Web/src/
  App.tsx              Rutas ENC agregadas (4 rutas)
  shared/navigation/appNavigation.ts  Entradas de nav ENC (residente + admin)
```

## Rutas registradas

| Ruta | Componente | Rol |
|------|-----------|-----|
| `/encuestas` | `EncuestasPage` | Residente |
| `/encuestas/:id` | `EncuestaDetallePage` | Residente |
| `/admin/encuestas` | `AdminEncuestasPage` | Admin |
| `/admin/encuestas/:id/resultados` | `ResultadosEncuestaPage` | Admin |

## Endpoints consumidos

| Hook / Página | Endpoint BE |
|---------------|------------|
| `useEncuestasActivas` | `GET /ENC/Encuestas/activas` |
| `useEncuestasAdmin` | `GET /ENC/Encuestas` |
| `EncuestaDetallePage` | `GET /ENC/Encuestas/{id}` · `POST /ENC/Encuestas/{id}/respuestas` |
| `AdminEncuestasPage` | `POST /ENC/Encuestas` · `PUT /ENC/Encuestas/{id}/publicar` |
| `ResultadosEncuestaPage` | `GET /ENC/Encuestas/{id}/resultados` |

## Verificación final (/revisar 2026-10-19)

### Criterios de aceptación

- [x] **CA-1**: Residente ve lista de encuestas activas con badge "Ya respondiste" si participó.
- [x] **CA-2**: Residente envía formulario (radio + texto libre) → POST 204.
- [x] **CA-3**: Admin puede crear encuesta en borrador y publicarla.
- [x] **CA-4**: Admin visualiza resultados con porcentajes por opción.

### Pruebas

- **Vitest**: 8 tests OK (`AdminEncuestasPage.test.tsx` + tests integración shell)
- **TypeScript**: `tsc --noEmit` limpio (0 errores)
- **Build**: `vite build` sin errores

### Auditorías

- auditor-codigo: **APROBADO** — patrón hooks/páginas consistente con shell; `apiClient` usado correctamente
- auditor-seguridad: **APROBADO** — JWT propagado por `apiClient`; sin exposición de datos admin a residente
