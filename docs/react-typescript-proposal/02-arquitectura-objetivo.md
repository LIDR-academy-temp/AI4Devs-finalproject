# 2. Arquitectura objetivo

## Vista general

```text
React + TypeScript
        |
        | HTTPS / JSON
        v
API de documentos
        |
        +--> Mock de seguridad
        |    (identidad y permisos simulados)
        |
        v
Capa de aplicación
        |
        v
Adaptador de persistencia
        |
        +--> procedimientos existentes
        +--> modelo ORM futuro
        v
SQL Server / almacenamiento de archivos
```

## Componentes

### Frontend

Aplicación React responsable de navegación, formularios, tablas, validaciones de experiencia y estados de carga.

### API

Capa HTTP responsable de validación, paginación, errores y serialización JSON. La identidad y los permisos utilizados por los casos de uso provienen del mock de seguridad; la autenticación y autorización reales no forman parte del proyecto.

### Mock de seguridad

Componente de desarrollo y pruebas que simula el usuario actual y sus permisos. Permite representar escenarios autorizados, sin identidad y sin permiso, sin conectarse a `SeguridadVES` ni a un proveedor de identidad real.

### Aplicación

Casos de uso independientes de HTTP y de React:

- `ListDocuments`
- `GetDocument`
- `CreateDocument`
- `UpdateDocument`
- `UploadDocumentFile`
- `DownloadDocument`
- `DeleteDocument`

### Persistencia

Al inicio puede invocar los procedimientos existentes mediante un adaptador. Más adelante puede reemplazarse por repositorios y ORM sin cambiar el frontend.

## Regla de transición

Web Forms y la nueva aplicación pueden coexistir. El módulo nuevo debe consumir la API y no llamar directamente a SOAP ni a SQL Server.
