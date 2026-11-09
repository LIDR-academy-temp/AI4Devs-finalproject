# Despliegue producción — PROD-ADMIN-001

Ejecutar **en la BD de SmarterASP** (`CuartaQuinientos`) **antes** de publicar API/Web con este cambio.

## Qué hace cada script (resumen)

| Script | Propósito |
|--------|-----------|
| `DB-009_fix_views_y_tablas.sql` | Login (`sgr.RefreshTokens`), vistas `usr`/`sgr`/`tkt`, `wms.vsPrestamos` (requiere tablas `wms` ya creadas) |
| `DB-006_arc_vsarchivos_fechacreacion.sql` | Columna `FechaCreacion` en `arc.vsArchivos` → evita 500 en `/admin/archivos` |
| `DB-005_wms_schema.sql` | Esquema y tablas `wms` → evita 400 en almacén |
| `DB-005_wms_prestamos_notas.sql` | Columna `Notas` en préstamos (idempotente; redundante si `DB-005_wms_schema` ya la incluyó) |
| `DB-001_alineacion_modelo.sql` | Solo si producción nunca se alineó al modelo post-DB-001 **y** existen tablas `tkt` completas (p. ej. `tkt.CategoriasTicket`). **No usar en prod legacy + DB-009 ya aplicado** |
| `DB-003_anm_tipos_seed.sql` / `DB-004_enc_seed.sql` | Seeds si catálogos vacíos |

**DB-009 no reemplaza DB-005 ni DB-006** — no toca `arc.vsArchivos` ni crea el esquema `wms`.

### Error `Invalid object name 'tkt.CategoriasTicket'` (línea ~179 de DB-001)

- **Causa:** la BD de SmarterASP no tiene esa tabla (esquema tickets incompleto o anterior a `cuartaquinientos_schema.sql`).
- **Para PROD-ADMIN-001:** **detén DB-001**; no lo necesitas si ya corriste **DB-009** (esa vista de tickets ya quedó recreada sin depender de `CategoriasTicket`).
- **Siguiente paso:** solo **`DB-005_wms_schema.sql`** + **`DB-006_arc_vsarchivos_fechacreacion.sql`** (no hace falta terminar DB-001).
- **`CategoriaTicketID` línea ~270:** misma causa — `tkt.Tickets` legacy sin esa columna; el DB-001 del repo ya usa vista asignados «legacy». Si no necesitas alinear tickets, **no reejecutes DB-001**.
- **Solo si más adelante quieres alinear tickets al modelo readme:** crea antes las tablas faltantes del bloque `tkt` en `cuartaquinientos_schema.sql` (o restaura desde un backup alineado) y entonces reevalúa DB-001.

---

## Si ya aplicaste `DB-009_fix_views_y_tablas.sql`

Omitir DB-009. **Validar huecos** en la BD de la API:

```powershell
sqlcmd -S $server -d $db -b -I -i "$root\20261029_PROD-ADMIN-001_VALIDAR_BD_COMPLETA.sql"
```

(Auditoría corta: `20261029_PROD-ADMIN-001_VALIDAR_GAPS.sql`.)

**Aplicar lo que marque FALTA** (idempotente; WMS + archivos):

```powershell
sqlcmd -S $server -d $db -b -I -i "$root\20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql"
```

Equivalente manual: solo **`DB-005_wms_schema.sql`** + **`DB-006_arc_vsarchivos_fechacreacion.sql`**.

Opcional después del smoke: seeds `DB-003` / `DB-004` si no hay tipos de anuncio o tipos de pregunta de encuesta.

---

## Orden completo (prod sin DB-009 previo)

**No incluye DB-001** — en SmarterASP suele fallar o ser innecesario; usar solo la sección «Si ya aplicaste DB-009» arriba.

Idempotente (referencia entornos alineados):

```powershell
$server = "<tu-servidor-sql>"
$db = "CuartaQuinientos"
$root = "d:\LIDR\ProyectoFinal\feature-entrega-1-AFS\SQL"

# sqlcmd ... DB-001_alineacion_modelo.sql   # solo BD dev/test con esquema tkt completo
sqlcmd -S $server -d $db -b -I -i "$root\DB-005_wms_schema.sql"
sqlcmd -S $server -d $db -b -I -i "$root\DB-005_wms_prestamos_notas.sql"
sqlcmd -S $server -d $db -b -I -i "$root\DB-006_arc_vsarchivos_fechacreacion.sql"
sqlcmd -S $server -d $db -b -I -i "$root\DB-009_fix_views_y_tablas.sql"
sqlcmd -S $server -d $db -b -I -i "$root\DB-003_anm_tipos_seed.sql"
sqlcmd -S $server -d $db -b -I -i "$root\DB-004_enc_seed.sql"
```

---

## Smoke post-SQL

```sql
SELECT COL_LENGTH('arc.vsArchivos','FechaCreacion') AS ArcFechaCreacion;  -- datetime (8), no NULL
SELECT OBJECT_ID('wms.Articulos','U') AS WmsArticulos;                     -- NOT NULL
SELECT TOP 1 1 FROM usr.vsMascotas;
```

Después: desplegar **GraphApi** y **Web** build de la rama con PROD-ADMIN-001.

## Verificación manual

| Ruta admin | Esperado |
|------------|----------|
| `/admin/archivos` | Listado sin error 500 |
| `/admin/anuncios` → tab Tipos | CRUD tipos |
| `/admin/perfiles` | Nuevo / editar / eliminar |
| `/admin/encuestas/1/resultados` | Resultados sin 500 |
| `/admin/almacen` | Alta artículo sin WMS_SCHEMA_MISSING |
| `/admin/vehiculos` | Alta con marca inválida → mensaje 422, no 500 |
