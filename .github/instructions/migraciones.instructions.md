---
applyTo: "backend/migraciones/**"
---

# Revisión de las migraciones de Alembic

La base real guarda las lecturas de SAT2 y las cuentas de los clientes. Una migración equivocada puede perder datos que no se recuperan.

- **`upgrade` y `downgrade`.** Toda migración tiene las dos funciones, y `downgrade` deshace exactamente lo que hace `upgrade`. Señalar un `downgrade` vacío o con `pass`.
- **Nunca editar una migración ya fusionada.** Si el pull request cambia un archivo de `versions/` que ya existe en `main`, es **Bloqueante**: el cambio va en una migración nueva.
- **Cadena de revisiones.** `down_revision` apunta a la última migración existente; no puede haber dos cabezas.
- **Datos existentes.** Una columna nueva `NOT NULL` en una tabla con filas necesita un valor por defecto o una carga previa. Un cambio de tipo o un borrado de columna debe explicar qué pasa con los datos que ya están.
- **Coincidencia con los modelos.** Lo que crea la migración debe coincidir con `backend/app/datos/modelos.py` (tipos, nulos, índices, claves foráneas y restricciones).
- **Nada de datos de prueba.** Una migración no siembra estaciones, cuentas ni lecturas ficticias.
