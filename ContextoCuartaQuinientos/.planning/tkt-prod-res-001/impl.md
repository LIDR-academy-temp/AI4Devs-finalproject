[← design](design.md) | [index](_index.md) | [delta →](delta.md)

# impl.md — PROD-RES-001

## GraphApi

| Archivo | Cambio |
|---------|--------|
| `Repositories/ENC/CuartaEncuestasRepository.cs` | `GROUP BY` opciones incluye `o.Orden` |
| `Repositories/TKT/TicketCatalogoRepository.cs` | `ResolveCanalIdAsync` nullable si no hay `CanalesTicket` |
| `Repositories/TKT/ITicketCatalogoRepository.cs` | Firma `Task<int?>` |
| `Services/TKT/CuartaTicketService.cs` | Canal opcional; notificación admins en try/catch |
| `Services/TKT/CuartaTicketAdminService.cs` | Alineado canal nullable |
| `GraphApi.Tests/…` | Tests ticket + encuestas (suite local verde) |

## Web

| Área | Archivos |
|------|----------|
| Encuestas residente | `useEncuestasActivas.ts`, `parseEncuestaId.ts`, `encuestaQuestionTypes.ts`, `EncuestasPage.tsx`, `EncuestaDetallePage.tsx`, `ResultadosEncuestaPage.tsx`, tests |
| Navegación | `menuToNav.ts` (`supplementApiNavWithManifest`), `useNavegacionMenus.ts`, `menuToNav.test.ts` |
| Visitas residente | `MisPasesVisitaPage.tsx` — select tipos ID vía `useTiposIdentificacionVisitas` |

## SQL

| Script | Propósito |
|--------|-----------|
| `SQL/20261030_sgr_visitas_pases_menu_residente.sql` | Menú `/visitas/pases` + PerfilMenus Residente |

## Verificación

| Check | Resultado |
|-------|-----------|
| Vitest nav + encuestas (sesión) | OK |
| `tsc --noEmit` Web | OK |
| `dotnet test` tickets/encuestas | OK (GraphApi local) |
| Deploy prod GraphApi/Web/SQL | **Pendiente humano** |

## Notas operación

- **RefreshToken 401 en login**: no es defecto; ver spec CA implícito y `AuthContext` + `refreshSession.ts`.
- **Saltar al contenido**: skip link a11y en `LoginPage` (`cq-login-skip`); visible solo con foco Tab.

## Auditoría

- **auditor-sql**: script menú idempotente; sin DML destructivo.
- **auditor-codigo**: cambios acotados; patrón supplement documentado en design.
- **Veredicto**: **APROBADO** documental; prod requiere deploy.
