# VES

Sistema institucional para la gestión de documentos, archivos y servicios de la Ventanilla Electrónica de Servicios (VES).

Este documento resume la arquitectura y el funcionamiento del VES a partir de la documentación técnica y de la solución actual. La aplicación vigente está construida con ASP.NET Web Forms y servicios SOAP/ASMX. La propuesta React + TypeScript descrita al final es una ruta de modernización y no forma parte de la implementación actual.

## Propósito

VES centraliza la consulta y administración de documentación institucional y proporciona navegación controlada por permisos. El módulo documental permite:

- Consultar documentos filtrados por tipo.
- Crear y editar los metadatos de un documento.
- Cargar y descargar archivos asociados.
- Gestionar fechas de publicación y caducidad.
- Marcar documentos como públicos.
- Eliminar documentos de acuerdo con los permisos del usuario.
- Registrar y consultar la bitácora de operaciones.

El portal también integra servicios institucionales, reportes y otros subsistemas. Los menús, módulos y opciones disponibles se construyen dinámicamente según el usuario, la entidad, el sistema y el perfil autorizado.

## Arquitectura actual

La solución está compuesta por sitios ASP.NET Web Forms y servicios de datos. El flujo principal es:

```text
Navegador
    |
    v
PortalVES: páginas ASPX y code-behind VB.NET
    |
    v
Proxies SOAP / servicios ASMX
    |
    v
VESDATOS y servicios institucionales
    |
    v
Procedimientos almacenados y bases de datos
```

La presentación, parte de la lógica de negocio y la integración con servicios están distribuidas entre las páginas `.aspx`, sus archivos `.aspx.vb`, `App_Code`, adaptadores y proxies generados desde WSDL.

### Componentes principales

- **PortalVES:** portal Web Forms, páginas, controles, estilos, JavaScript, autenticación y proxies de servicios.
- **VESDATOS:** servicios ASMX para documentos, seguridad, archivos, reportes, menús y acceso a datos.
- **PortalVES.Autenticacion:** servicio de autenticación del portal.
- **VES.sln:** solución de Visual Studio que agrupa los sitios web y proyectos relacionados.
- **Otros servicios institucionales:** la solución declara integraciones con componentes como `ACT_Datos`, `DIF_Datos`, `SIC_Datos`, `ORADATOS`, `VaR_Datos` y `WCF_Reportes`.

## Módulo documental

Las pantallas principales del módulo son:

- `PortalVES/ListarDocumentos.aspx`: consulta y filtrado de documentos.
- `PortalVES/EditorDocumentos.aspx`: alta y edición de metadatos.
- `PortalVES/BajarDocumento.aspx`: descarga del archivo asociado.
- `PortalVES/Bitacora.aspx`: consulta de la bitácora.

El layout común se define en `MasterPage.master`. Los controles Web Forms, como `GridView`, `DropDownList`, `FileUpload`, `Calendar`, `UpdatePanel` y `ObjectDataSource`, gestionan la interacción y la presentación de la información.

## Seguridad y permisos

El acceso utiliza los servicios del esquema `SeguridadVES` para obtener información de:

```text
Usuario -> Entidad -> Sistema -> Modulo -> Opcion
                         |
                       Perfil
```

También se consideran las relaciones entre usuarios y perfiles, y entre perfiles y opciones. Entre los procedimientos documentados se encuentran:

- `SeguridadVES.SG_ObtieneDatosUsuario`
- `SeguridadVES.SG_ObtieneModulosUsuario`
- `SeguridadVES.SG_ObtieneOpcionesUsuario`
- `SeguridadVES.SG_ObtienePerfilesUsuario`

`PortalVES` utiliza Forms Authentication, con `Login.aspx` como página de inicio de sesión y `Bienvenido.aspx` como destino inicial. El acceso anónimo se deniega globalmente según la configuración del portal. Otros servicios pueden utilizar Windows Authentication.

## Modelo de datos

### Documentos

La entidad documental principal se basa en `STI_Documentos`, relacionada con el catálogo `STI_TiposDocumento`:

```text
STI_TiposDocumento 1:N STI_Documentos
```

Campos conceptuales documentados:

```text
STI_TiposDocumento
    CodigoTipoDoc
    Nombre
    Estado

STI_Documentos
    CodigoDocumento
    CodigoTipoDoc
    Titulo
    Resumen
    Publico
    FechaPublicacion
    UsuarioPublica
    FechaCaduca
    NombreArchivo
    Documento
```

Operaciones principales:

- `ListarTiposDocumentos`
- `ListarDocumentos`
- `ObtenerDocumento`
- `GuardarDocumento`
- `SubirArchivo`
- `BajarArchivo`
- `EliminarDocumento`

Los metadatos y el archivo se gestionan mediante operaciones separadas: primero se guarda o actualiza el registro, luego se obtiene el código del documento y finalmente se carga o descarga el archivo asociado.

### Seguridad

El modelo de seguridad incluye conceptualmente las entidades `Usuario`, `Entidad`, `Sistema`, `Modulo`, `Opcion`, `Perfil`, `UsuarioPerfil` y `PerfilOpcion`. Las tablas físicas y todas sus relaciones no están descritas completamente en la documentación disponible; el acceso conocido se realiza mediante procedimientos almacenados del esquema `SeguridadVES`.

## Acceso a datos

El patrón actual de persistencia es:

```text
Servicio ASMX
    -> SqlConnection
    -> SqlCommand
    -> procedimiento almacenado con parámetros
    -> SqlDataAdapter
    -> DataSet / DataTable
```

La aplicación no utiliza ORM ni repositorios explícitos. Los procedimientos almacenados concentran buena parte de la lógica de persistencia y los servicios transportan los resultados mediante `DataSet`.

La documentación identifica SQL Server como la base principal de los servicios de datos. También existen componentes con `System.Data.OracleClient` y configuraciones de Oracle, por lo que la base utilizada puede variar según el subsistema integrado y el entorno.

## Tecnologías

- ASP.NET Web Forms.
- VB.NET y .NET Framework 4.0; algunos proyectos utilizan .NET Framework 3.5.
- IIS y runtime de ASP.NET.
- Servicios SOAP/ASMX y proxies generados desde WSDL.
- ADO.NET, `SqlConnection`, `SqlCommand`, `SqlDataAdapter`, `DataSet` y `DataTable`.
- SQL Server y componentes relacionados con Oracle.
- Forms Authentication y Windows Authentication.
- AjaxControlToolkit.
- Microsoft ReportViewer 10.
- CSS clásico, JavaScript y controles server-side de Web Forms.

## Estructura del repositorio

```text
VES/
├── VES.sln
├── PortalVES/
│   ├── App_Code/
│   ├── Formularios-STI/
│   ├── Formularios-SAS/
│   ├── Controles/
│   ├── styles/
│   ├── js/
│   ├── images/
│   ├── MasterPage.master
│   ├── Login.aspx
│   ├── Bienvenido.aspx
│   └── web.config
├── VESDATOS/
│   ├── App_Code/
│   ├── Documentos.asmx
│   ├── SeguridadVES.asmx
│   ├── Service.asmx
│   ├── Archivos.asmx
│   ├── ReportesSQL.asmx
│   └── web.config
├── PortalVES.Autenticacion/
├── lidr-specboot/
├── packages/
└── docs/
```

## Configuración y ejecución

La configuración se distribuye principalmente en:

- [`PortalVES/web.config`](../PortalVES/web.config)
- [`VESDATOS/web.config`](../VESDATOS/web.config)
- [`PortalVES.Autenticacion/web.config`](../PortalVES.Autenticacion/web.config)
- [`VES.sln`](../VES.sln)

Los archivos de configuración contienen URLs de servicios SOAP, rutas de archivos, logs, reportes, autenticación, correo y parámetros de entorno. No deben copiarse credenciales, claves criptográficas ni contraseñas al README ni al control de versiones.

La ejecución esperada es mediante Visual Studio/IIS o un entorno compatible con sitios ASP.NET Web Forms. Como mínimo se requiere:

- Visual Studio compatible con sitios web ASP.NET clásicos.
- .NET Framework 4.0 y componentes de ASP.NET/IIS.
- Dependencias de Microsoft ReportViewer.
- Servicios SOAP accesibles.
- SQL Server y las bases configuradas para el entorno.
- Rutas de archivos existentes y permisos de lectura/escritura.
- Configuración válida de autenticación, reportes, correo y directorios.

La solución contiene puertos de desarrollo y referencias a servicios en `VES.sln` y en los archivos `web.config`. Los valores concretos dependen del entorno y no deben asumirse como una configuración universal.

## Manejo de errores y validación

El manejo de errores utiliza `Global.asax`, `Application_Error`, `LogInfo()` y la ruta de logs configurada mediante `LogVes`. Las páginas pueden mostrar el estado de la operación mediante controles como `lbStatus`.

No se observan proyectos de pruebas automatizadas, scripts `npm test` o `dotnet test`, ni un pipeline de integración continua documentado. La validación actual es principalmente manual:

1. Ejecutar el portal en Visual Studio o IIS.
2. Iniciar sesión con un usuario configurado.
3. Verificar navegación y permisos.
4. Probar consulta, alta, edición, carga, descarga y eliminación de documentos.
5. Revisar mensajes de pantalla y logs ante errores.

## Modernización propuesta

El directorio [`react-typescript-proposal`](react-typescript-proposal/README.md) define una ruta gradual para modernizar el módulo documental con React, TypeScript, una API HTTP desacoplada, contratos JSON y pruebas automatizadas. Su objetivo es validar una nueva experiencia sin reemplazar inmediatamente todo Web Forms.

La propuesta deja fuera de la primera etapa:

- Reescribir todo VES.
- Migrar inmediatamente la base de datos.
- Construir un Kanban.
- Eliminar Web Forms antes de validar la nueva experiencia.
- Modificar producción durante la etapa de documentación.

Por tanto, cualquier API HTTP, frontend React o manejo de comentarios descrito en esa carpeta debe considerarse diseño futuro, no una capacidad disponible en la aplicación actual.

## Documentación relacionada

- [`backend-guidelines.md`](backend-guidelines.md): servicios, acceso a datos, errores y pruebas.
- [`frontend-guidelines.md`](frontend-guidelines.md): Web Forms, controles, estilos, responsive y accesibilidad.
- [`design-flow.md`](design-flow.md): navegación, permisos y flujo del módulo documental.
- [`DataBase_flow.md`](DataBase_flow.md): persistencia, procedimientos y flujo de archivos.
- [`dataModel.md`](dataModel.md): modelo documental y de seguridad.
- [`prompts.md`](prompts.md): prompts utilizados para el análisis y la documentación.
- [`react-typescript-proposal/README.md`](react-typescript-proposal/README.md): propuesta de modernización.
- [`react-typescript-proposal/02-arquitectura-objetivo.md`](react-typescript-proposal/02-arquitectura-objetivo.md): arquitectura objetivo.
- [`react-typescript-proposal/04-backend-api.md`](react-typescript-proposal/04-backend-api.md): endpoints HTTP propuestos.
- [`react-typescript-proposal/06-manejo-y-mantenimiento-de-comentarios.md`](react-typescript-proposal/06-manejo-y-mantenimiento-de-comentarios.md): comentarios propuestos.

## Aspectos pendientes de confirmar

- El significado institucional formal de las siglas VES no está definido en la documentación técnica disponible.
- Debe confirmarse qué servicios se ejecutan localmente y cuáles pertenecen a infraestructura externa.
- La base de datos y el proveedor efectivo pueden variar entre subsistemas y entornos.
- Las relaciones físicas completas del modelo de seguridad requieren validación con el esquema real.