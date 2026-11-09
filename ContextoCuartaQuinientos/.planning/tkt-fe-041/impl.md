# impl.md — tkt-fe-041 (Frontend: padrón usuarios/residentes Admin)

## Fecha
2026-10-22

## Tipos — `src/shared/types/usuariosAdmin.ts`

| Tipo | Campos clave |
|------|-------------|
| `UsuarioPadronItem` | usuarioId, nombre, correo, telefono?, perfil, bActivo |
| `UsuarioCreado` | usuarioId, passwordTemporal |
| `CasaListItem` | casaId, condominioId, condominioNombre?, direccion?, numero? |

## Hooks

### `usePadronUsuarios(perfilFilter?, soloActivos)` (`src/features/admin/usuarios/usePadronUsuarios.ts`)
- GET `/SGR/Usuarios?perfil={perfil}&bActivo=true` (querystring condicional)
- Usa destructuring correcto: `const { data: list, problem, status } = await apiGet<...>(path)` — **sin bug apiGet**
- Estado: `data: UsuarioPadronItem[]`, `loading`, `error`
- Expone `refetch` (callback)

### `useCasasSelect()` (`src/features/admin/usuarios/useCasasSelect.ts`)
- GET `/SGR/Casas`
- Usa destructuring correcto: `const { data, problem, status } = await apiGet<CasaListItem[]>(...)` — **sin bug apiGet**
- Estado: `casas: CasaListItem[]`, `loading`, `error`
- Usado en el formulario de alta de usuario para selector de casa

## Página — `AdminUsuariosPage` (`src/pages/AdminUsuariosPage.tsx`)
- Ruta: `/admin/usuarios` (adminOnly)
- Usa `usePadronUsuarios()` + `useCasasSelect()`
- Funcionalidades: listar residentes con filtro por perfil/activos, crear usuario (POST genera password temporal), activar/desactivar usuario, ver detalle
- Sin tests de página separados (cobertura en integración/humo)

## Rutas

| Path | Componente | Guard |
|------|-----------|-------|
| `/admin/usuarios` | `AdminUsuariosPage` | adminOnly |
