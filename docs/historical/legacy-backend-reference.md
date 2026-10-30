# Referencia histórica — Backend legado VES

> **ARCHIVADO (A):** el contenido que sigue describe la solución ASP.NET Web Forms/VB.NET/SOAP anterior. **No es una norma activa** para desarrollar `Bccr.Supen.Ves.Api` o `Bccr.Supen.Ves.Mapi` en .NET 8. Se conserva sin cambios de fondo para migración/compatibilidad. El original íntegro también está en `originales_sin_modificar/backend-guidelines(1).md`.

---

# Guía de backend para VES

## Alcance

Este documento describe el backend observado en el repositorio actual de VES, con evidencia del código fuente disponible en el proyecto. No se implementa Kanban ni cambios en producción. El objetivo es documentar la estructura real para una evolución futura con más control y consistencia.

## 1) Stack y versiones relevantes

Evidencia observada:
- La solución VES está en `VES.sln`.
- Los proyectos web tienen `TargetFrameworkMoniker = ".NETFramework,Version%3Dv4.0"` o 3.5 en algunos sitios.
- `PortalVES/web.config` establece `compilation debug="true" targetFramework="4.0"`.
- `PortalVES.Autenticacion`, `VESDATOS`, `PortalVES` y otros proyectos web se ejecutan como sitios ASP.NET clásicos.
- El stack relevante es:
  - ASP.NET Web Forms
  - VB.NET
  - IIS / ASP.NET runtime
  - SOAP Web Services
  - Microsoft Reporting Viewer
  - ADO.NET + `DataSet`
  - Oracle / SQL Server / conexiones configuradas en `web.config`

Conclusión:
- El backend actual es una arquitectura legacy basada en sitios web ASP.NET y servicios SOAP, no en una API REST moderna ni un backend de microservicios.

## 2) Entry point real y routing

Evidencia observada:
- `PortalVES/web.config` define:
  - `authentication mode="Forms"`
  - `defaultUrl="Bienvenido.aspx"`
  - `loginUrl="Login.aspx"`
- El default document se define como `bienvenido.aspx`.
- `MasterPage.master` es el layout común y la página carga el contenido principal en `ContentPlaceHolder ID="contenidoPrincipal"`.
- Cada pantalla reside en `.aspx` con su código-behind `.aspx.vb`.

Patrón real:
- El punto de entrada de la aplicación es el sitio web ASP.NET, no un backend aparte con router central.
- La navegación se hace por URL y el servidor renderiza páginas completas.
- La autenticación y permisos se resuelven por sesión y por servicios backend, no por middleware de API moderna.

## 3) Organización de páginas, servicios y clases de backend

### UI y backend en el mismo sitio
Evidencia observada:
- `PortalVES/` contiene páginas, master page, CSS, JS y lógica en `App_Code`.
- Los archivos `.aspx.vb` contienen lógica de página.
- Los web services consumidos se declaran en `App_Code` como clases proxy, por ejemplo:
  - `Documentos.vb`
  - `Service.vb`
  - `SeguridadVES.vb`
  - `Archivos.vb`
  - `DatosGrid.vb`
  - `Dropdown.vb`

### Capa de business logic y adaptadores
Evidencia observada:
- En `PortalVES/App_Code` hay clases con nombres tipo `CListarDocumentos`, `CUsuarios`, `C_ReporteDoc`, `C_EditorDocumentosWord`.
- Estas clases actúan como adaptadores entre la UI y los servicios externos.
- `CListarDocumentos.vb` es un ejemplo claro:
  - crea un cliente SOAP `Documentos.Documentos`
  - hace `getListaDocumentos` y `getTiposDocumentos`
  - devuelve `DataSet` para la UI

### Servicios externos
Evidencia observada:
- `PortalVES/web.config` define URLs para servicios como:
  - `Service`
  - `Documentos`
  - `SeguridadVES`
  - `Archivos`
  - `ReportesSQL`
  - `DropDown`
  - `DatosGrid`
- Hay otros proyectos web en la solución como `VESDATOS`, `PortalVES.Autenticacion`, `ACT_Datos`, `DIF_Datos`, `SIC_Datos`, `ORADATOS`, que actúan como servicios conectados a la app principal.

## 4) Patrón de acceso a APIs/servicios

Evidencia observada:
- `CListarDocumentos.vb`:
  - `Dim l_objServicio As Documentos.Documentos = New Documentos.Documentos`
  - `l_objServicio.Credentials = CredentialCache.DefaultCredentials`
  - `Return l_objServicio.ListarDocumentos(a_numTipo)`
- `ListarDocumentos.aspx.vb`:
  - `Dim l_objServAutenticacion As New SistemaAutenticacion.Service()`
  - `l_objServAutenticacion.obtenerOpciones(l_strLogin, m_numSistema, m_numModulo, m_numOpcion)`
- `EditorDocumentos.aspx.vb`:
  - `Dim l_oServicioDoc As New Documentos.Documentos()`
  - `GuardarDocumento(...)`, `SubirArchivo(...)`, `ObtenerDocumento(...)`

Patrón observado:
- El backend usa SOAP por proxy generado (`wsdl`); no se observa un patrón REST/JSON ni DTOs modernos.
- El flujo típico es: `Page` -> `App_Code` adaptor -> SOAP service -> `DataSet` -> UI binding.
- El error y la validación se manejan del lado del server, no en un backend API separado con middleware de errores.

## 5) Convenciones de nombres y arquitectura

Evidencia observada:
- Los archivos del backend usan nombres directos por funcionalidad: `Service.vb`, `Documentos.vb`, `SeguridadVES.vb`, `Archivos.vb`, `ReportesSQL.vb`.
- La capa de UI y negocio usa nombres con prefijos por dominio: `CListarDocumentos`, `CUsuarios`, `C_ReporteDoc`.
- Variables en VB siguen un patrón de prefijos de tipo (por ejemplo `l_objServicio`, `l_dsOpciones`, `m_numSistema`, `lbStatus`, `ddlTipo`).
- Hay clases de negocio y servicios con nombres antiguos, de estilo legacy y mezcla de español/inglés.

Conclusión:
- Hay una convención funcional, pero no una arquitectura formal de capas ni namespaces estrictos.
- El diseño actual prioriza productividad y compatibilidad, no clean architecture.

## 6) Persistencia y configuración

Evidencia observada:
- `PortalVES/web.config` contiene cadenas de conexión y appSettings.
- Los servicios apuntan a endpoints locales o remotos vía configuración (`SEC-Subsistemas`, `Service`, `Documentos`, `SeguridadVES`, etc.).
- Las clases `App_Code` hacen llamadas a servicios y manipulan `DataSet` / `DataTable`, no hay un ORM ni repositorios explícitos.

Patrón observado:
- El acceso a datos es indirecto y centralizado en servicios externos, con configuración en `web.config`.
- La capa de datos no está desacoplada por repositorios ni interfaces; depende de servicios SOAP y de objetos de datos `DataSet`.

## 7) Manejo de errores, logging y validación

Evidencia observada:
- `PortalVES/Global.asax` define `Application_Error` y usa `LogInfo()` para registrar errores en `Log_Ves.log`.
- `LogInfo()` escribe al archivo del sistema desde `AppSettings("LogVes")`.
- También hay manejo de errores y mensajes de validación al usuario con `lbStatus.Text` en páginas como `EditorDocumentos.aspx.vb` y `ListarDocumentos.aspx.vb`.

Observación:
- Hay manejo de errores visible y de log centralizado, pero no una estrategia uniforme de exception handling por capa ni de result objects.
- No hay un patrón formal de `try/catch` por servicio ni un middleware de errores unificado.

## 8) Testing disponible y cómo ejecutarlo

Evidencia observada:
- No se encontraron proyectos de pruebas ni test frameworks dentro de la solución VES.
- No se encontró `MSTest`, `NUnit`, `xUnit`, `pytest`, `Jest`, `Vitest` ni scripts de test ejecutables.
- La solución es un sitio web ASP.NET clásico y la validación es principalmente manual desde el navegador/IIS/Visual Studio.

Conclusión:
- El backend no tiene una suite de pruebas automatizadas observable en el repositorio actual.
- El tipo de validación real es manual de flujos funcionales y ejecución del portal con datos reales o de entorno.

## 9) Loading, error y empty state en backend

Evidencia observada:
- En UI (`ListarDocumentos.aspx` / `EditorDocumentos.aspx`) hay mensajes de estado como `lbStatus` para errores y validaciones.
- En `Global.asax` hay logging de errores del sitio.
- No existe una convención clara de error response estructurado ni de empty state para backend.

Conclusión:
- El backend no está diseñado para devolver payloads de API con códigos estandarizados; los errores suelen resolverse por pantalla y log del servidor.

## 10) Dependencias que no deberíamos añadir sin justificación

No conviene añadir sin necesidad:
- REST JSON como reemplazo inmediato del patrón SOAP actual, sin una estrategia de compatibilidad.
- Frameworks ORM nuevos para sustituir la arquitectura existente sin evaluar impacto operacional.
- Nuevas capas de frontend o SPA si aún no hay un plan de migración razonado.
- Versiones modernas de .NET o ASP.NET si la solución actual corre sobre .NET Framework 4.0 y comparte servicios legacy con infraestructura institucional.
- Bibliotecas de cliente o paquetes de Node que no se usan ni se integran con el flujo actual de IIS/ASP.NET.

Recomendación:
- añadir tecnología nueva solo cuando la compatibilidad con los servicios actuales, la seguridad y la operación real del sistema lo justifiquen.

## 11) Archivos y áreas fuera de alcance

Áreas que no forman parte de la capa de backend urgente a revisar en una primera guía:
- Proyectos del entorno externo integrados a la solución: `ACT_Datos`, `DIF_Datos`, `SIC_Datos`, `ORADATOS`, `VaR_Datos`.
- Archivos `.exclude` y copias de trabajo en `App_Code` que no son la versión de producción activa.
- Configuraciones de entorno y endpoints físicos de Oracle/SQL/IIS en `web.config` y appSettings.
- Assets, CSS y JavaScript de presentación que pertenecen más a la capa de UI que al backend.

## A) Convenciones observadas en el repositorio

- El backend está basado en ASP.NET Web Forms y VB.NET.
- La lógica del backend es server-side; no hay una API REST separada ni un router de servicios moderno.
- Los servicios internos y externos se exponen como SOAP y se consumen vía proxies generados en `App_Code`.
- La configuración se centraliza en `web.config`.
- El flujo principal es `Page_Load` -> servicio -> `DataSet` -> UI.
- La validación y el manejo de errores se hacen en el server.
- Hay logging centralizado en `Global.asax`.
- Hay una mezcla de patrones legacy y nombres de clases funcionales, sin una capa de dominio o repositorio formal.
- La solución no presenta pruebas automatizadas visibles.

## B) Recomendaciones

- Mantener el backend actual como base y evolucionarlo de forma incremental.
- Definir una capa de servicios más explícita para desacoplar la lógica de UI de la integración SOAP.
- Establecer una convención de nombres más clara para clases, métodos y datos de negocio.
- Crear un estándar de manejo de errores y logging consistente, con mensajes de validación y trazabilidad más claros.
- Definir un patrón de resultados de negocio para evitar `DataSet` no tipado en más puntos del sistema.
- Introducir testing automatizado gradual, incluso si es mínimo, para reemplazar la validación manual actual.
- Evitar reescrituras grandes sin un plan de compatibilidad con los servicios y conexiones actuales.
- Asegurar que cualquier migración o mejora respete la infraestructura y rutas reales configuradas en `web.config`.

## Resumen ejecutivo

El backend de VES es una solución ASP.NET Web Forms legacy con VB.NET, servicios SOAP, `DataSet`, configuración centralizada y acceso a varios subsistemas externos. Su fortaleza es la compatibilidad con la infraestructura institucional y la experiencia acumulada en el sistema; su riesgo principal es la falta de capas formales, pruebas automatizadas y una estrategia clara de manejo de errores y servicios. La recomendación es reforzar la capa de integración y validación sin romper la infraestructura existente, y así avanzar de forma segura hacia una solución más mantenible.
