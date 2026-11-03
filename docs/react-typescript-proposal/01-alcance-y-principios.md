# 1. Alcance y principios

## Problema actual

El módulo de documentos depende de páginas Web Forms, eventos de servidor, `DataSet`, proxies SOAP y servicios que acceden directamente a SQL Server.

## Primera capacidad a modernizar

El primer vertical debe ser **consulta y gestión básica de documentos**:

1. listar documentos
2. filtrar por tipo
3. consultar el detalle
4. crear o editar metadatos
5. cargar un archivo
6. descargar un archivo
7. eliminar un documento según permisos simulados y reglas de negocio

## Principios

- migración incremental, no reemplazo masivo
- API como límite entre frontend y backend
- TypeScript estricto
- contratos y modelos tipados
- autorización funcional simulada en backend, no solo en la interfaz
- conservar inicialmente las operaciones y reglas existentes
- cada paso debe poder validarse de forma independiente

## Alcance de seguridad

La autenticación y autorización reales quedan fuera del alcance de este proyecto. Para desarrollar y probar los flujos funcionales se utilizará un **mock de seguridad** que suministre una identidad simulada y permisos configurables.

El proyecto no implementará inicio de sesión real, emisión o validación de tokens, integración con un proveedor de identidad ni llamadas a `SeguridadVES`. Los permisos simulados se utilizarán únicamente para representar escenarios permitidos y denegados y para validar las reglas funcionales en backend y frontend.

## Decisiones pendientes

- ubicación del binario: base de datos o almacenamiento de archivos
- framework backend para la API
- estrategia definitiva de migración de procedimientos almacenados
