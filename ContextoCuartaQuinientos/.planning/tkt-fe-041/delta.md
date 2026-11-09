# delta.md — tkt-fe-041 (Frontend: padrón usuarios/residentes Admin)

## Fecha
2026-10-22

## Archivos entregados

| Archivo | Descripción |
|---------|-------------|
| `src/shared/types/usuariosAdmin.ts` | 3 tipos: UsuarioPadronItem, UsuarioCreado, CasaListItem |
| `src/features/admin/usuarios/usePadronUsuarios.ts` | Hook listado usuarios con filtros |
| `src/features/admin/usuarios/useCasasSelect.ts` | Hook selector de casas para formulario |
| `src/pages/AdminUsuariosPage.tsx` | Página CRUD usuarios/residentes |

## Endpoints consumidos

| Hook/Acción | Endpoint | Método |
|-------------|----------|--------|
| `usePadronUsuarios` | `/SGR/Usuarios?perfil=&bActivo=` | GET |
| `useCasasSelect` | `/SGR/Casas` | GET |
| Crear usuario | `/SGR/Usuarios` | POST |
| Activar/desactivar | `/SGR/Usuarios/{id}` | PATCH |

## Decisiones clave

1. **Hooks sin bug apiGet**: A diferencia de los módulos anteriores (VEH, MAS, WMS), `usePadronUsuarios` y `useCasasSelect` usan destructuring correcto de la respuesta `apiGet` (`const { data, problem, status } = await apiGet<T>()`). Estos hooks fueron escritos en una iteración posterior con el patrón corregido.

2. **`CasaListItem` en tipos de usuario**: El tipo `CasaListItem` vive en `usuariosAdmin.ts` (no en `casasAdmin.ts`) porque su uso principal es el selector de casas en el formulario de alta de usuario. `useCasasSelect` consume el endpoint `/SGR/Casas` de `USR-BE-010`.

3. **`UsuarioCreado.passwordTemporal`**: Al crear un usuario, la API retorna la contraseña temporal generada. La UI la muestra al admin para que la entregue al residente en el primer acceso.

4. **`usePadronUsuarios` recibe `perfilFilter`**: Permite filtrar por "Residente", "Administrador" u omitir para mostrar todos. La página de admin puede usar esto para separar vistas.
