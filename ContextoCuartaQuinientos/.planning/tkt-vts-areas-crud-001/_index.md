# TKT-VTS-AREAS-CRUD-001

| Campo | Valor |
|-------|--------|
| Estado | LISTO PARA PR |
| Dominio | [[visitas-areas]] |
| Rama sugerida | `feature/VTS-AREAS-CRUD-001-areas-reservas-completo` |

## Objetivo
Módulo VTS áreas/reservas operativo: contrato REST Cuarta camelCase, CRUD admin de áreas, residente reserva, admin consulta/cancela.

## Artefactos
- [spec.md](spec.md)
- [design.md](design.md)
- [impl.md](impl.md)

## APIs REST (Cuarta)
| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/VTS/AreasComunes` | JWT |
| POST | `/VTS/AreasComunes` | Admin |
| PUT | `/VTS/AreasComunes/{id}` | Admin |
| DELETE | `/VTS/AreasComunes/{id}` | Admin |
| POST | `/VTS/ReservacionesArea` | Residente |
| GET | `/VTS/ReservacionesArea/mias` | Residente |
| GET | `/VTS/ReservacionesArea/calendario` | JWT |
| GET | `/VTS/ReservacionesArea/admin` | Admin |
| PATCH | `/VTS/ReservacionesArea/{id}/cancelar` | Admin |
