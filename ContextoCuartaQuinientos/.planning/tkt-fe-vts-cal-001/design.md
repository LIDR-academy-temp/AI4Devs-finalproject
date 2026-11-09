[← spec](spec.md) | [← index](_index.md)

# design.md — FE-VTS-CAL-001

## Estrategia

Agregar lectura **comunitaria** de reservas por área y rango; UI calendario semanal simple (CSS grid) sin dependencia pesada. Anti-solape sigue en `CrearReservacionAsync`.

### Escalera de decisión

| Capacidad | Peldaño | Objeto | Por qué |
|-----------|---------|--------|---------|
| Listado ocupación | 4 | `ListarReservacionesCalendarioAsync` en `ICuartaVisitasService` | Repo VTS ya tiene joins |
| UI calendario | 4 | Componente `ReservasCalendarioSemanal.tsx` | Evitar FullCalendar (peldaño 5 dep nueva) |
| Privacidad | 4 | DTO sin correo | Cambio mínimo proyección SQL |

## backend:cuartaquinientos-api

| Endpoint | Verbo | Query | Auth |
|----------|-------|-------|------|
| `/VTS/ReservacionesArea/calendario` | GET | `areaComunId`, `desde`, `hasta` | JWT cualquier residente+ |

SQL (esqueleto):

```sql
SELECT r.ReservacionAreaID, r.FechaInicio, r.FechaFin, e.ReservacionEstado AS Estado
FROM vts.ReservacionesArea r
JOIN vts.ReservacionesEstados e ON ...
WHERE r.AreasComunesID = @AreaId
  AND r.bEliminado = 0
  AND e.ReservacionEstado NOT IN (N'Cancelada') -- por nombre catálogo
  AND r.FechaFin > @Desde AND r.FechaInicio < @Hasta
```

Resolver estado cancelada **por nombre** (ADR catálogos).

## frontend:cuartaquinientos-web

| Pieza | Acción |
|-------|--------|
| `useReservacionesCalendario.ts` | GET calendario |
| `ReservasCalendarioSemanal.tsx` | Grid 7 columnas × franjas hora o all-day row |
| `AreasYReservacionesPage.tsx` | Tab “Calendario” + “Mis reservas” |

Modo día completo: si duración ≥ 23h `(asumido)`, render banda `all-day` en columna del día.

## Contenido configurable

| # | Contenido | Clase | Fuente |
|---|-----------|-------|--------|
| 1 | Leyenda estados | ARB | `reservas.calendario.legend.*` |
| 2 | Etiqueta celda ocupada | Catálogo | `RESERVA_OCUPADA_LABEL` |

## Orden de implementación

| # | Entregable | Dep | Estado |
|---|------------|-----|--------|
| 1 | Repo query calendario + test xUnit | — | ✓ Hecho |
| 2 | Controller GET | 1 | ✓ Hecho |
| 3 | Hook + componente calendario | 2 | ✓ Hecho |
| 4 | Integrar en AreasYReservacionesPage | 3 | ✓ Hecho |
| 5 | Vitest | 4 | ✓ Hecho |

## Plan de pruebas

| ID | Capa | Caso | Expected |
|----|------|------|----------|
| TC-VTS-C-1 | xUnit | Rango solapa parcial | eventos correctos |
| TC-VTS-C-2 | xUnit | Cancelada excluida | count 0 |
| TC-VTS-C-3 | Vitest | Render 2 eventos | 2 bloques DOM |
| TC-VTS-C-4 | Integración | POST conflicto | 422 igual que antes |

## Pasada adversarial

| Punto | Respuesta |
|-------|-----------|
| FullCalendar | YAGNI — grid propio |
| Filtrar por casa | Out of scope |
| TZ DST | Usar UTC store + display local |

**Veredicto:** APROBADO.
