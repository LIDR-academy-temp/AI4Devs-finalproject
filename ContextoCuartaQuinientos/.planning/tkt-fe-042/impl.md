# impl.md — FE-042: Admin Casas Page

## Ticket
**FE-042** — Vista de administración de casas (`/admin/casas`)

---

## Archivos implementados

### Tipos
**`Web/src/shared/types/casasAdmin.ts`**

```typescript
export interface CondominioItem {
  condominioId: number;
  nombre: string;
  direccion?: string;
}

export interface CasaAdminItem {
  casaId: number;
  condominioId: number;
  condominioNombre?: string;
  direccion?: string;
  numero?: string;
  propietarioUsuarioId?: number;
  propietarioNombre?: string;
}
```

---

### Hook de datos
**`Web/src/features/admin/casas/useCasasAdmin.ts`**

```typescript
// Fetch paralelo: casas + condominios
const [casasRes, condRes] = await Promise.all([
  apiGet<CasaAdminItem[]>(`/SGR/Casas?condominioId=${condominioId ?? ''}`),
  apiGet<CondominioItem[]>('/SGR/Casas/condominios'),
]);

// Destructuring correcto — SIN bug de apiGet
setCasas(casasRes.data ?? []);
setCondominios(condRes.data ?? []);
```

**Interfaz expuesta**:
```typescript
interface UseCasasAdminReturn {
  casas: CasaAdminItem[];
  condominios: CondominioItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}
```

**Parámetro**: `condominioId?: number` — permite filtrar por condominio al montar el componente.

> **apiGet correctness**: Hook usa destructuring correcto `const { data, problem, status } = await apiGet<T>(...)` — no tiene el bug presente en hooks anteriores (VEH, MAS, WMS).

---

### Página
**`Web/src/features/admin/casas/AdminCasasPage.tsx`**

- Ruta: `/admin/casas` (adminOnly en `appNavigation.ts`)
- Consume `useCasasAdmin(condominioId?)`
- Selector de condominio para filtrar la lista de casas
- CRUD: listar, crear (modal/form), editar, eliminar con confirmación
- Manejo de estados: loading, error, lista vacía

---

### Tests
**`Web/src/features/admin/casas/AdminCasasPage.test.tsx`**

5 `it(` tests con Vitest + React Testing Library:

| # | Descripción |
|---|-------------|
| 1 | Renderiza lista de casas cuando la carga es exitosa |
| 2 | Muestra estado de carga durante fetch |
| 3 | Muestra mensaje de error cuando el API falla |
| 4 | Filtra casas al cambiar el selector de condominio |
| 5 | Permite crear/editar/eliminar (acción principal del CRUD) |

---

### Registro de ruta
**`Web/src/shared/navigation/appNavigation.ts`** (preexistente, entry ya incluida):
```typescript
{ path: '/admin/casas', label: 'Casas', adminOnly: true, implemented: true }
```

**`Web/src/app/router.tsx`** (o equivalente):
```typescript
{ path: 'casas', element: <AdminCasasPage /> }  // bajo /admin/
```

---

## Flujo de datos

```
AdminCasasPage
  └── useCasasAdmin(condominioId?)
        ├── GET /SGR/Casas?condominioId=...  → CasaAdminItem[]
        └── GET /SGR/Casas/condominios       → CondominioItem[]
```

Ambas llamadas se ejecutan en paralelo con `Promise.all`. Al cambiar el filtro de condominio, el hook hace refetch solo de `/SGR/Casas?condominioId=<nuevo>`.
