# Índice de fuentes y responsabilidades documentales VES

Actualización editorial: 2026-10-28. **Estado del repositorio y ambiente no verificado**.

| Fuente | Propietario documental / contenido | Uso correcto del agente |
|---|---|---|
| [base-standards](./base-standards.md) | Reglas transversales para UI/API/MAPI | Instrucciones comunes, control de cambios y prioridad |
| [backend-standards](./backend-standards.md) y [ejemplos](./backend-examples.md) | Convenciones API/MAPI .NET | Buenas prácticas, sin sustituir los contratos reales |
| [frontend-standards](./frontend-standards.md) y [ejemplos](./frontend-examples.md) | Convenciones de UI React | React, accesibilidad, pruebas, componentes comunes |
| [documentation-standards](./documentation-standards.md) | Actualización y procedencia de documentos | Qué documentos actualizar y cómo reportar pruebas |
| [development_guide](./development_guide.md) | Configuración de entorno UI → API → MAPI | Setup y comandos, verificar efectos secundarios |
| [openspec-tasks](./openspec-tasks-mandatory-steps.md) | OpenSpec y control de pruebas | Solo al crear tareas/implementar con autorización; no afecta exploración en solo lectura |
| [api-spec.yml](./api-spec.yml) | Contrato REST representativo de la API | Revisar rutas/respuestas con código; **no** concluir que está completo o verificado |
| [data-model.md](./data-model.md) | DTO y contratos de transferencia | No inferir tablas o claves foráneas |
| [MODELOS_Y_PERSISTENCIA](./MODELOS_Y_PERSISTENCIA.md) | Relación DTO/SQL/modelo histórico | Navegación por modelos |
| [SCHEMA.md](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md) | Esquema, SP y expectativa de DA | No certificar estado SQL vivo sin DBA/consulta autorizada |
| [Guía endpoint API](../VES/Bccr.Supen.Ves.Api/Documentacion/ComoCrearUnNuevoEndpoint.md) | Procedimiento Controller → SI.SG → MAPI | Guía operativa de cambios aprobados |
| [Guía endpoint MAPI](../VES/Bccr.Supen.Ves.Mapi/Documentacion/ComoImplementarUnMAPI.md) | Procedimiento Controller → BW → DA | Evitar copiar ejemplos SQL sin parametrizar |
| [README UI](../VES/Bccr.Supen.Ves.UI/README.md), [README raíz](../README.md) | Entrada de cada proyecto | Distinguir aplicación activa de históricos |
| [READMEVES histórico](./historical/READMEVES-webforms.md) | VES Web Forms/ASMX anterior | Migraciones y análisis histórico, **no** arquitectura vigente |

## Fuentes visuales y operativas

- UI: [prototipo/Design System](../VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-SYSTEM.md), [handoff](../VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-HANDOFF.md), [usabilidad](../VES/Bccr.Supen.Ves.UI/Documentacion/USABILIDAD.md) y [deploy](../VES/Bccr.Supen.Ves.UI/Documentacion/Deploy.md).
- API: [SPEC](../VES/Bccr.Supen.Ves.Api/SPEC.md), [deploy](../VES/Bccr.Supen.Ves.Api/Documentacion/Deploy.md).
- MAPI: [verificación del entorno](../VES/Bccr.Supen.Ves.Mapi/Documentacion/VerificacionEntorno.md), [SCHEMA](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md).
- La documentación de diseño puede citar assets y manifiestos no suministrados; tales referencias **no** se consideran verificadas.

## Si los documentos discrepan

Revisar código/configuración de la rama vigente, documentación específica del componente,
estándares compartidos e históricos, en ese orden. Confirmar por separado
comportamiento real en ambientes y contratos SQL. No resolver contradicciones
por antigüedad ni por preferencia del agente. Registrar los casos pendientes en
[verificaciones transversales](./VERIFICACIONES_PENDIENTES_TRANSVERSALES.md)
y conservar los listados V de los paquetes previos.
