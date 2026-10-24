# Tasks

## 1. TK-06 · API CRUD de conciliaciones con validación de período y parámetros

- [ ] 1.1 Crear `ReconciliationsModule` con DTOs de creación (nombre, período, parámetros opcionales) y tipo `ReconciliationConfig` con defaults
- [ ] 1.2 Implementar `POST /reconciliations` (estado DRAFT, `createdById` del token, `companyId` del token)
- [ ] 1.3 Implementar `GET /reconciliations` con paginación, filtro por estado y por solapamiento de período, orden por fecha descendente
- [ ] 1.4 Implementar `GET /reconciliations/{id}` con parámetros, estado, archivos y `stats`
- [ ] 1.5 Implementar la máquina de estados `assertTransition` y el método `changeStatus` del servicio (incluye COMPLETED→CLOSED)
- [ ] 1.6 Tests unitarios de validación de período, defaults de parámetros y transiciones de estado
- [ ] 1.7 Tests de integración de los tres endpoints incluyendo aislamiento por empresa (404 para otra empresa)

## 2. TK-07 · Pantallas de listado y creación de conciliaciones

- [ ] 2.1 Crear el layout autenticado (barra superior con usuario y cerrar sesión) y las rutas `/reconciliations`, `/reconciliations/new`, `/reconciliations/:id`
- [ ] 2.2 Implementar la tabla de listado con nombre, período, estado, porcentaje conciliado y fecha, paginación y filtros por estado y período
- [ ] 2.3 Implementar el paso 1 del asistente: formulario de nombre, período y parámetros con defaults, validación de fechas y errores del servidor
- [ ] 2.4 Implementar la página de detalle con cabecera de estado y parámetros (las pestañas de resultados llegan en `results-and-manual-matching`)
- [ ] 2.5 Hooks de TanStack Query para listado, detalle y creación con invalidación de caché
- [ ] 2.6 Tests de componentes del formulario (validación de fechas, defaults) y del listado (filtros)

## 3. Cierre del change

- [ ] 3.1 Registrar la PR en readme §7 y los prompts relevantes en prompts.md
