# Verificaciones V pendientes — documentación transversal VES

Fecha de consolidación documental: 2026-10-28. **Ninguna V queda resuelta por esta entrega.**

| ID | Documento(s) | Verificación pendiente | Evidencia necesaria |
|---|---|---|---|
| V-T01 | `api-spec.yml`, API `SPEC.md`, informe Fase 1 | Método/ruta de `ObtengaElUsuarioPorTokenGaudiAsync`: OpenAPI documenta GET con `idToken` por query, otros documentos POST con ruta distinta | Controller real, atributos de routing, pruebas HTTP |
| V-T02 | `api-spec.yml` y código API/MAPI | Extensiones, tipo MIME, tamaño máximo de **previsualización** (OpenAPI 10 MB) y respuesta `application/pdf` para otras extensiones; distinguirlo del límite de **carga** | Controller, guardias de tamaño, integración, requisito aprobado |
| V-T03 | `api-spec.yml`, `SPEC.md`, `backend-standards` | Comportamiento JWT/bypass y 401/403 en Development, QA, Staging y Production | Handler actual, opciones efectivas por ambiente, prueba autorizada |
| V-T04 | `api-spec.yml`, `VerificacionEntorno.md` | Endpoint `/healthcheckVES`: cobertura, ruta real, necesidad de `api-version`, payload y estados HTTP | Mapas de ruta, middleware y pruebas del servicio correspondiente |
| V-T05 | `api-spec.yml`, `SCHEMA.md`, `data-model.md` | Contratos de documentos caducados, DTO y estados de verificación de los procedimientos | Historias aprobadas, pruebas de API/MAPI, evidencia DBA |
| V-T06 | `api-spec.yml` | Carácter representativo versus cobertura de rutas, esquemas, seguridad y respuestas del OpenAPI | Comparación automatizada controller/DTO/API y pruebas |
| V-T07 | `development_guide.md`, OpenSpec | Comandos y ramas Git efectivas; paquetes, versiones, rutas y acceso en el repositorio actual | `README.md`, `.nvmrc`, `.csproj`, scripts reales, `AGENT.md` |
| V-T08 | OpenSpec `openspec-tasks-mandatory-steps.md` | Disponibilidad/alias de comandos OpenSpec, `openspec/config.yaml`, herramientas Playwright MCP y capacidad de ejecución | Repositorio y configuración local real |
| V-T09 | `READMEVES-webforms.md` | Existencia/ubicación de pantallas legadas, módulos históricos y propuesta React/TypeScript | Solución legado y artefactos originales |
| V-T10 | `documentation-standards.md` | Vínculos y referencias a AGENT.md, manifests HTML/JSON, configuraciones y pruebas que existen en el repositorio, pero cuya correspondencia debe verificarse | Comparación de rutas, referencias y contenido con el repositorio actual |
| V-T11 | `api-spec.yml`, especificaciones UX | Restricciones de descargas/visualización, permisos, nombres de archivo y tratamiento de contenido binario | Requisito vigente, controlador API y UI, pruebas de autorización |

## Verificaciones anteriores conservadas

- [Backend](./VERIFICACIONES_PENDIENTES.md).
- [Frontend](./VERIFICACIONES_PENDIENTES_FRONTEND.md).
- [Modelos y persistencia](./VERIFICACIONES_PENDIENTES_MODELOS.md).

Las operaciones de escritura, cambios de autorización, modificaciones SQL, integraciones
con proveedores externos y despliegues exigen autorización separada.
