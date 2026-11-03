# Verificaciones pendientes (V) — Backend VES API y MAPI

**Estado:** pendiente; ninguna de las situaciones siguientes fue resuelta por inferencia. No se modificaron código, configuración de ejecución, bases de datos, políticas de seguridad ni pipelines.

| ID | Origen | Cuestión para corroborar | Evidencia mínima antes de cambiar texto/implementación |
|---|---|---|---|
| CR-01 | `SPEC.md` vs informe Fase 1 | JWT: `IsDevelopment()` frente a `!IsProduction()`; efecto sobre Staging/QA | `AutenticacionJwtSinValidarHandler.cs`, Startup, options y settings efectivos por ambiente, pruebas |
| CR-02 | `SPEC.md` / estándares | JWT sin verificación criptográfica en el handler; quién verifica firma, expiración, emisor y audiencia | Topología de confianza, gateway/UI, control de acceso directo y pruebas negativas |
| CR-03 | `SPEC.md` / Deploy / SG | Flags de `ApiEndpoint`, mTLS y decoradores Development | Startup, opciones tipadas, proveedor, SG, certificado y pruebas por ambiente |
| CR-04 | `Deploy.md` | Instrucción «quitar security» carece de archivo, causa y consecuencia | Archivo/nodo exactos, error original, evaluación de seguridad y autorización |
| CR-05 | contratos API/MAPI | Rutas, DTOs, versionado y serialización; no imponer cambios sin consumidor | Controllers, interfaces, pruebas y contratos OpenSpec actuales |
| CR-06 | pruebas | Matriz de frameworks, mocks, test runners y Quality Gate vigentes | `.csproj`, solución y pipeline vigentes |
| CR-07 | dependencias | Versiones de paquetes .NET/EF, owners de esquema, contratos DBA | `.csproj`, Directory.Packages.props, DBA y ambiente |
| CR-08 | flujo Git/CI | Rama principal, permisos y posibilidad de PR/deploy | Settings de repo y flujo de aprobación |
| CR-09 | cabecera del estándar | Compatibilidad del front matter `globs/alwaysApply` con Copilot y ubicación correcta | Configuración de instrucciones, workspace real, rutas de globs |
| CR-10 | despliegue | Redis y certificado: nodos, placeholders y perfiles | Config real y verificación de certificados por ambiente |
| CR-11 | guía MAPI: DA | SQL interpolado y `// NOSONAR` pueden ser inseguros | Implementación del repositorio, `FromSqlInterpolated`, parámetro SP y análisis SAST |
| CR-12 | guía MAPI: DA | `Task.Run` para trabajo I/O (falso async) | Interfaces/repositorio y opciones asíncronas reales |
| CR-13 | guía MAPI: Controller | `[AllowAnonymous]` y certificado comentado en ejemplo | Control de autorización de la ruta, mTLS, ambiente y acceso directo |
| CR-14 | `SCHEMA.md` / guía MAPI | Contradicción: documentos caducados incluidos vs filtrados | OpenSpec, historia, SP, consultas y pruebas con datos de no producción |
| CR-15 | `Deploy.md` / `release_notes.md` | Indicaciones de quitar `security` en API y MAPI | Identificar si se refieren al mismo control y aprobar por separado |
| CR-16 | `VerificacionEntorno.md` | `healthcheckVES` antes de auth: exposición/alcance | Startup, DTO de salida, seguridad de red, monitoreo |
| CR-17 | `VerificacionEntorno.md` | El check de directorio tiene escritura temporal | Revisar permisos e impactos antes de ejecutar como auditoría |
| CR-18 | `SCHEMA.md` | SP `storedprocedureSerie_LT_TOTAL_F`: cadena vacía vs NULL | Contrato real del SP y prueba de regresión en ambiente autorizado |
| CR-19 | `SCHEMA.md` | Evidencia reportada por DBA vs verificación independiente | Informe DBA, ambiente, fecha y permisos |
| CR-20 | `SCHEMA.md` | Tres filas de SP VES aparecen después del contrato narrativo | Confirmar posición/tablas y reordenar solo presentación sin perder entradas |
| CR-21 | `VerificacionEntorno.md` | Colisión de healthchecks institucionales y servicio propio | Startup, tests de regresión, paquete BCCR |
| CR-22 | `SCHEMA.md` | Nombres lógicos de conexión vs catálogos y SP cruzados | ConnectionStrings, esquema real y propietarios DBA |

## Regla de resolución

La salida correcta de cada V requiere: archivo(s) / contratos inspeccionados, ambiente, hallazgo reproducible, decisión aprobada y prueba de regresión. Registrar el cambio documental como una tarea separada; no convertir un V en C/U/R por intuición.
