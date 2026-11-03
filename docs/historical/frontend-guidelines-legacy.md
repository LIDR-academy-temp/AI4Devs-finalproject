> **ARCHIVO HISTÓRICO (A):** describe el Web Forms/VB.NET original. Se conserva como evidencia y referencia de migración; no utilizar sus patrones tecnológicos para generar componentes React nuevos.

# Guía de frontend para VES

## Alcance

Este documento describe el frontend observado en el repositorio actual de VES, con evidencia del código fuente disponible en el proyecto WebForms. No se implementa Kanban ni cambios de código. El objetivo es documentar la estructura real para poder actualizarla más adelante con criterio.

## 1) Stack y versiones relevantes

Evidencia observada:
- La solución se define en `VES.sln` y los proyectos web tienen `TargetFrameworkMoniker = ".NETFramework,Version%3Dv4.0"` o 3.5 en algunos sitios.
- El proyecto principal `PortalVES` define en `web.config`:
  - `compilation debug="true" targetFramework="4.0"`
  - `pages validateRequest="false" enableViewStateMac="false" controlRenderingCompatibilityVersion="3.5" clientIDMode="AutoID"`
- `packages.config` contiene dependencias ASP.NET de Reporting Services:
  - `MicrosoftReportViewerWebForms_v10` 1.0.0
  - `ReportViewer.Common.10` 1.0.0
- `MasterPage.master` registra `AjaxControlToolkit` con `tagprefix="ajaxtoolkit"` y `web.config` agrega el tag prefix para `AjaxControlToolkit`.

Conclusión:
- No hay un frontend moderno (React/Vue/Angular), ni build pipeline de Node.
- El frontend real es ASP.NET Web Forms clásico con controles server-side, CSS, JavaScript vanilla y componentes de AJAX Toolkit.

## 2) Entry point real y routing

Evidencia observada:
- `web.config` tiene:
  - `authentication mode="Forms"`
  - `forms loginUrl="Login.aspx" defaultUrl="Bienvenido.aspx"`
  - `authorization` global que deniega usuarios anónimos.
- Además, `web.config` define:
  - `defaultDocument` con `bienvenido.aspx` como documento por defecto.
- Los archivos `.aspx` son la capa de páginas reales, por ejemplo:
  - `PortalVES/Login.aspx`
  - `PortalVES/Bienvenido.aspx`
  - `PortalVES/Default.aspx`
  - `PortalVES/Formularios-STI/ListarDocumentos.aspx`
  - `PortalVES/Formularios-STI/EditorDocumentos.aspx`

Patrón real:
- El sistema usa navegación por URL a páginas `.aspx`.
- El routing no es basado en router del cliente ni rutas REST.
- Las páginas se incorporan al layout principal mediante `MasterPage.master` con `ContentPlaceHolder`.

## 3) Organización de páginas, componentes, servicios y tipos

### Páginas
Evidencia observada:
- `PortalVES/` contiene páginas raíz como `Login.aspx`, `Bienvenido.aspx`, `Default.aspx`, `Landing.aspx` y `MasterPage.master`.
- `PortalVES/Formularios-SAS/` agrupa módulos de administración.
- `PortalVES/Formularios-STI/` contiene los formularios de documentos (`ListarDocumentos.aspx`, `EditorDocumentos.aspx`, `BajarDocumento.aspx`, `Bitacora.aspx`).

### Controles y UI reusable
Evidencia observada:
- `PortalVES/Controles/` contiene múltiples ASCX (`UC_CargaArchivos.ascx`, `UC_Detalle_Archivos.ascx`, etc.).
- El `MasterPage.master` crea dinámicamente un `Accordion` a partir de datos de sesión y servicios de seguridad.

### Lógica del backend de páginas
Evidencia observada:
- Cada página `.aspx` tiene su `*.aspx.vb` asociado.
- La lógica de negocio de UI se guarda en `PortalVES/App_Code` y usa clases de ayuda como `CListarDocumentos`, `CUsuarios`, `Documentos`, `SeguridadVES`, etc.
- La mayoría de clases son `Partial Class ...` o clases de proxy para web services.

### Servicios y tipos
Evidencia observada:
- `PortalVES/App_Code/Documentos.vb` es un proxy generado por wsdl para un servicio SOAP.
- `PortalVES/App_Code/Service.vb` es el proxy para `SistemaAutenticacion.Service`.
- `CListarDocumentos.vb` actúa como adaptador de UI y encapsula la invocación de la API SOAP de documentos.
- En `web.config`, cada servicio tiene una URL configurada en `appSettings`:
  - `Documentos`, `Service`, `SeguridadVES`, `Archivos`, `ReportesSQL`, `Dropdown`, `DatosGrid`.

## 4) Patrón existente para consumir APIs o servicios

Evidencia observada:
- `CListarDocumentos.vb`:
  - instancia `Documentos.Documentos`
  - asigna `Credentials = System.Net.CredentialCache.DefaultCredentials`
  - llama a `getListaDocumentos` / `getTiposDocumentos`
- `ListarDocumentos.aspx.vb`:
  - crea `SistemaAutenticacion.Service()` para `obtenerOpciones(...)`
  - luego usa `ObjectDataSource` y `GridView` para enlazar datos.
- `EditorDocumentos.aspx.vb`:
  - crea `Documentos.Documentos()`
  - llama `ObtenerDocumento`, `GuardarDocumento`, `SubirArchivo`

Patrón observado:
- No hay client-side fetch/axios ni REST JSON.
- El patrón dominante es SOAP + proxy classes generadas + `DataSet` + `ObjectDataSource`/`GridView`.
- La UI construye formularios y grillas en servidor, no se trabaja con un store o estado global del cliente.

## 5) Estrategia de estilos y componentes UI

Evidencia observada:
- `MasterPage.master` cargan estos CSS:
  - `styles/EstiloPrincipal.css`
  - `styles/EstiloSubForm.css`
- La vista usa `asp:GridView`, `asp:DropDownList`, `asp:FileUpload`, `asp:Calendar`, `asp:ImageButton`, `asp:UpdatePanel`.
- La estructura general del layout se hace con `div` + `float:left` y anchos fijos en CSS.
- El proyecto usa estilo declarativo con clases y estilos inline en páginas como `EditorDocumentos.aspx` y `ListarDocumentos.aspx`.

Observaciones:
- El sistema se basó en CSS clásico y estilos escuetos.
- Hay una mezcla de CSS central y estilos inline embebidos en `.aspx`.
- No se observa un sistema de diseño modular ni tokenización por tema.

## 6) Convenciones de nombres

Evidencia observada:
- Páginas: `ListarDocumentos.aspx`, `EditorDocumentos.aspx`, `Bitacora.aspx`.
- Clases de negocio y adaptadores: `CListarDocumentos`, `CUsuarios`, `C_EditorDocumentosWord`, `C_ReporteDoc`.
- Web services proxies: `Documentos.vb`, `Service.vb`, `SeguridadVES.vb`.
- Variables en VB: `l_objServicio`, `l_dsOpciones`, `l_oRow`, `m_numSistema`, `m_numModulo`, `lbStatus`, `ddlTipo`, `txtTitulo`, `fuArchivo`.

Convención observada:
- Hay mezcla de estilos: inglés/inglés técnico, español del negocio, prefijos `lb`, `ddl`, `txt`, `fu`, `pn` para controles ASP.NET.
- Las clases de UI acaban con `C` o siguen nombres de entidad/funcionalidad.
- Los eventos y métodos usan PascalCase en VB, pero con prefijos de tipo muy antiguos (`lb`, `ddl`, `txt`, `gr`, `pn`).

## 7) Testing disponible y cómo ejecutarlo

Evidencia observada:
- No se encontró un proyecto de tests en la solución VES.
- No se encontraron archivos de prueba como `*.test.*`, `*.spec.*`, `MSTest`, `NUnit`, `xUnit`, `pytest` o scripts `npm test`/`dotnet test`.
- La solución es un conjunto de sitios web ASP.NET WebForms en Visual Studio, sin infraestructura de CI ni comandos de test automatizados dentro del repositorio.

Conclusión:
- El testing disponible en la práctica es manual, basado en ejecutar la aplicación en Visual Studio/IIS y probar flujos de usuario.
- La validación de business logic ocurre en runtime y pruebas exploratorias del sitio.

## 8) Patrones de loading, error y empty state

Evidencia observada:
- En `ListarDocumentos.aspx` se usa un `Label` `lbStatus` para mensajes de estado/errores.
- En `EditorDocumentos.aspx` también hay `lbStatus` con mensajes de validación del servidor.
- `Global.asax` captura `Application_Error` y registra detalles en un log (`Log_Ves.log`) vía `LogInfo()` y envía correo si hay error.
- No hay patrón formal de loading skeleton, spinner ni empty state visual customizado.
- El `GridView` de listado usa el comportamiento por defecto cuando no hay filas; no existe una plantilla `EmptyDataTemplate` aparente.

Conclusión:
- Hay manejo de errores en servidor y logging, pero no una UX consistente ni un diseño de empty/loading state para frontend.

## 9) Responsive y accesibilidad observadas

### Responsive
Evidencia observada:
- `EstiloPrincipal.css` tiene `body { min-width: 885px; }`
- Hay anchos fijos (`width: 200px`, `width: 100%`, etc.) y `float:left`.
- No hay media queries ni layouts adaptativos para tablet o móvil.

Conclusión:
- El sistema no está pensado para responsive moderno.

### Accesibilidad
Evidencia observada:
- Hay `alt` en imágenes y elementos `ImageButton` con `AlternateText`/`ToolTip`.
- El código usa algunos textos legibles y labels en los formularios.
- Sin embargo, no se observan `aria-*`, focus management, keyboard-first patterns ni comprobaciones de contrastes y semántica moderna.

Conclusión:
- Hay cierto cuidado básico de texto/alt, pero no un enfoque formal de accesibilidad web.

## 10) Dependencias que no deberíamos añadir sin justificación

No deberían añadirse sin una razón clara:
- Frameworks SPA modernos (React, Vue, Angular) para un proyecto que aún es Web Forms y ASP.NET 4.0.
- Bibliotecas de client-side state/global store para una aplicación sin arquitectura de frontend separada.
- REST/JSON puro como sustituto inmediato del patrón SOAP actual, sin antes establecer contratos de backend y compatibilidad.
- CSS frameworks complejos sin necesidad si el proyecto aún depende de estilos clásicos y de un layout server-rendered.
- Orm o capa de datos nueva (Entity Framework, Dapper, etc.) si el sistema ya dependen de Web Services y `DataSet`.
- Nuevos paquetes Node si no existe infraestructura real de frontend con `package.json` ni bundler.

La justificación recomendable es:
- priorizar estabilidad y compatibilidad con el sistema actual,
- mantener la coherencia con la infraestructura de autenticación y servicios existentes,
- introducir cambios incrementalmente con pruebas manuales y control de impacto.

## 11) Archivos o áreas fuera de alcance

Áreas claramente fuera de alcance para un ajuste de frontend/backend del VES en este momento:
- Proyectos de servicios externos integrados en la solución (`ACT_Datos`, `DIF_Datos`, `SIC_Datos`, `ORADATOS`, `VaR_Datos`, etc.).
- Proxies SOAP generados automáticamente dentro de `App_Code` y files `.exclude` que representan copias de trabajo o artefactos de generación.
- Assets estáticos como `images/`, `IMG_SAS/`, `Reportes/`, `js/` y CSS sin un diseño de sistema formal.
- Autenticación y seguridad centralizada por servicios de `PortalVES.Autenticacion` y `web.config`.
- Datos y rutas de infraestructura (Oracle, SQL Server, IIS, URLs de servicios remotos) que pertenecen al entorno operativo y no a la capa de presentación.

## A) Convenciones observadas en el repositorio

- La base UI es ASP.NET Web Forms clásico, no un frontend moderno.
- Las páginas son `.aspx` + `.aspx.vb` y usan `MasterPage.master` como layout global.
- El sistema usa autenticación Forms y redirección a `Login.aspx`.
- La navegación de módulos se construye dinámicamente desde servicios de autenticación.
- La lógica de integración se hace a través de web services SOAP y proxies `App_Code` generados.
- El flujo típico es: `Page_Load` -> consumir servicio -> bindear a `GridView`/`DropDownList` -> manejar eventos -> mostrar `lbStatus`.
- La capa visual depende más de CSS clásico y controles server-side que de componentes reutilizables.
- Los estilos usan anchos fijos, `float` y plantillas en CSS.
- No hay testing automatizado ni pipeline de frontend real.
- Hay logging centralizado en `Global.asax` pero sin patrón formal de UX para error/loading/empty states.

## B) Recomendaciones

- Mantener la base actual y evolucionarla de forma incremental, respetando el patrón ASP.NET Web Forms existente.
- Introducir una capa más clara de servicios y adaptadores para separar acceso a datos/WS de lógica de presentación.
- Definir una convención de nombres más coherente para clases y controles (`lb`, `ddl`, `txt`, `pn` es útil, pero debe aplicarse y documentarse).
- Crear un estilo compartido y un sistema mínimo de diseño para CSS, con menos inline styles y más clases reutilizables.
- Añadir una estrategia de estado visual (loading, empty, error) con `Label`, `Panel` o plantillas `EmptyDataTemplate` más explícitas.
- Asegurar un plan de accesibilidad y responsive antes de introducir diseños complejos.
- Establecer un estándar para evitar dependencias nuevas sin necesidad y priorizar compatibilidad con WebForms.
- No mezclar nuevas tecnologías de frontend con la arquitectura existente sin primero definir una estrategia de migración y compatibilidad.

## Resumen ejecutivo

El frontend actual de VES es un portal legacy basado en ASP.NET Web Forms, con master pages, controles server-side, CSS clásico y consumo de servicios SOAP centralizados en `App_Code`. Su mayor fortaleza es la compatibilidad directa con la infraestructura institucional existente; su mayor riesgo es la falta de un modelo UI moderno, pruebas automatizadas y una estrategia clara de UX. La recomendación es mantener la arquitectura actual como base y mejorar la organización, la consistencia visual y la política de integración de manera incremental, sin introducir tecnología nueva sin justificación de negocio y compatibilidad.
