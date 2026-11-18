# Firmadoc

## Índice

0. [Ficha del proyecto](#0-ficha-del-proyecto)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)
8. [Seguimiento en Jira](#8-seguimiento-en-jira)

---

## 0. Ficha del proyecto

### **0.1. Tu nombre completo:**
Bruno Benjamin Meliton Vergara

### **0.2. Nombre del proyecto:**
Firmadoc

### **0.3. Descripción breve del proyecto:**
Firmadoc es un **servicio de firma digital institucional**: un único componente, mantenido por el área de sistemas de un organismo público, que cualquier aplicación del organismo consume para firmar documentos PDF sin salir de su propia interfaz (mediante un widget embebible y una API). Elimina el flujo manual actual de "descargar el documento → firmarlo afuera con el token → volver a subirlo al sistema". Su modo principal es la **firma con el token criptográfico que los funcionarios ya tienen**, con certificado de una Autoridad Certificante licenciada (firma digital con presunción legal, Ley 25.506), mediante un agente local y **firma diferida**: el servidor prepara el PDF y calcula el hash, el token firma solo ese hash y el servidor incrusta la firma, de modo que el documento nunca viaja a la PC del usuario y la clave privada nunca toca el servidor. Además ofrece firma remota (ej. FirmAR/SIU) y un motor propio de firma electrónica para demostraciones, detrás de la misma interfaz.

### **0.4. URL del proyecto:**
_Pendiente — se completará cuando exista un despliegue (Entrega 3)._

### 0.5. URL o archivo comprimido del repositorio
https://github.com/bv3rgara/AI4Devs-finalproject (fork de `LIDR-academy/AI4Devs-finalproject`). Ramas: `feature/entrega-1-bbmv` (documentación), `feature/entrega-2-bbmv` (código funcional) y `final-project-bbmv` (entrega final, que también se integra en `main`).

### **0.6. Tablero y backlog en Jira**
- **Sitio:** https://vergara-bruno.atlassian.net
- **Proyecto:** `SCRUM` — *Mi espacio de scrum*
- **Tablero Scrum:** [board 1](https://vergara-bruno.atlassian.net/jira/software/projects/SCRUM/boards/1)
- **Backlog:** [backlog del tablero](https://vergara-bruno.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog)
- **Épica del producto:** [SCRUM-1](https://vergara-bruno.atlassian.net/browse/SCRUM-1) — *[Firmadoc] MVP — Firma digital institucional*
- **Detalle de claves HU/tickets:** [docs/jira-backlog.md](docs/jira-backlog.md)

La **fuente de verdad funcional** de historias y criterios sigue siendo las secciones [5](#5-historias-de-usuario) y [6](#6-tickets-de-trabajo) de este readme; Jira refleja el mismo alcance para seguimiento, estimación y sprint.

---

## 1. Descripción general del producto

### **1.1. Objetivo:**

Que un organismo público tenga **un solo servicio de firma digital**, reutilizable por todos sus sistemas, en lugar de que cada aplicación implemente (o contrate) su propio firmador. Hoy, en muchos organismos, los funcionarios ya tienen un token con certificado de una AC licenciada, pero el sistema documental no tiene forma de invocar la firma: el usuario descarga el documento, lo firma por fuera y lo vuelve a subir. Esto es lento, propenso a errores y deja la validación de la firma (cadena de confianza, vigencia, revocación) librada a cada sistema.

Firmadoc resuelve esto con un **widget embebible** (diseñado para integrarse también en sistemas Angular, un framework frecuente en organismos públicos; la integración con una página Angular de prueba es un criterio de aceptación del Ticket 2) y un **backend con proveedores de firma intercambiables**: la firma con el token USB del usuario (a través de un agente local, porque un navegador o un servidor no pueden acceder al token), la delegación en servicios de firma remota y un motor propio de firma electrónica para pruebas y demostraciones.

**A quién aporta valor:**
- **Usuarios finales (funcionarios)**: firman sin salir del sistema que ya usan, con su token, ingresando el PIN una sola vez aun para un lote de documentos.
- **Equipos de desarrollo de los sistemas del organismo**: integran firma digital sin construir un firmador propio ni gestionar drivers, tokens ni validación de certificados.
- **Área de sistemas y auditoría**: concentran en un solo lugar la validación de las firmas, la política de confianza y la trazabilidad de quién firmó qué, cuándo y con qué certificado.

### **1.2. Características y funcionalidades principales:**

- **Firma digital con token mediante agente local (modo principal, `token`)**: una aplicación liviana instalada en la PC del usuario (Firmadoc Agent) accede al token por PKCS#11, muestra un diálogo de confirmación con el nombre del documento, pide el PIN localmente y firma únicamente los hashes que recibe. El PIN y la clave privada nunca salen del token ni de esa PC.
- **Firma diferida**: el servidor prepara el PDF (reserva el espacio de la firma, calcula el hash de los atributos firmados) y, cuando el token devuelve la firma, la incrusta. El PDF no viaja a la PC; la clave privada no toca el servidor.
- **Validación en el servidor**: antes y después de firmar se verifica la cadena de confianza hasta la AC Raíz, la vigencia, la revocación (CRL/OCSP) y que el hash devuelto corresponda a un desafío vigente de esa sesión. El cotejo del CUIL del certificado con el del firmante es **opcional** (`FIRMADOC_REQUIRE_CUIL_MATCH=true`); por defecto no se coteja: firma quien tiene el token y su PIN, y la firma registra el certificado usado.
- **PAdES nivel B-B en el MVP**; con sello de tiempo y revocación embebida (nivel B-LT) en una versión posterior, para que la firma siga siendo verificable a largo plazo (requiere un servicio de sellado de tiempo; ver 2.7).
- **Firmas múltiples sobre un mismo documento**: cada firma nueva se agrega como actualización incremental del PDF, sin invalidar las anteriores.
- **Widget de firma embebible**: se integra vía `<iframe>` (mecanismo principal, sin acoplarse al framework del sistema host) o vía Web Component, en cualquier sistema cliente.
- **Motor de firma propio (`local`)**: firma el PDF con certificados propios (autofirmados o de una CA de demostración) usando `pyHanko`. Produce firma electrónica (no firma digital con presunción legal) y permite demostrar y evaluar todos los flujos sin token físico.
- **Adaptador de servicio de firma remota (`firmar`, simulado)**: replica el contrato de integración de FirmAR/SIU (OAuth + envío de documento + callback con OTP/PIN en el servicio remoto), para usuarios que firman con certificado remoto y no con token USB.
- **Arquitectura de proveedores intercambiable**: agregar un nuevo proveedor de firma no requiere tocar el resto del sistema (patrón adapter/strategy).
- **Carga de PDF desde el navegador**: en general la firma **parte de cargar un PDF** en la sección «Firmar documento» del panel (uno o varios; con varios se firman en lote). El PDF queda guardado como versión original (v1) y se firma con el widget embebido en esa misma página.
- **Vinculación de documentos existentes (camino por sistema integrador)**: el sistema integrador envía el PDF (o referencia un documento que Firmadoc ya conoce, por su ID) y recibe una `signing_url` embebible; sigue existiendo junto a la carga desde el navegador.
- **Descarga y versionado del resultado**: al completar la firma, el documento firmado queda **siempre** disponible para descarga directa, con el nombre original del archivo (`download_url` / base64) **y, al mismo tiempo**, registrado como una **nueva versión** del documento original — sin sobrescribir la versión anterior, pero marcada como la vigente, para seguir operando sobre ese documento. No son dos caminos alternativos: ambas cosas ocurren en toda firma completada.
- **Estados del documento y fecha límite**: cada documento recorre `borrador → pendiente de firma (con fecha límite opcional) → firmado`, de modo que el sistema integrador puede mostrar y filtrar qué está pendiente de firma.
- **Listado de firmantes por documento**: quién firmó, cuándo y con qué certificado, consultable desde la API y el panel.
- **Notificación por webhook**: el sistema integrador recibe un aviso automático cuando el documento queda firmado.
- **Panel de administración y auditoría**: listado de documentos con su origen (individual o lote), versión y vencimiento; detalle de cada documento como **cadena de custodia** (línea de tiempo, versiones descargables y datos técnicos); gestión de anclas de confianza, del certificado propio y de **sistemas integradores y sus claves**.
- **Autenticación de sistemas integradores**: cada sistema que usa Firmadoc se registra y opera con su propia API key (OAuth2 client-credentials en la versión 2).
- **Firma en lote**: firmar varios documentos con una sola confirmación. Con el agente de token, el certificado se elige y valida una vez, todos los hashes se envían en una única llamada y el PIN se pide una sola vez; el resultado puede ser parcial («2 de 3 firmados»), con descarga de los firmados (ZIP) y reintento de los fallidos. La firma remota **no** se admite por lote en esta versión (según un relevamiento previo, el servicio limita la cantidad de documentos por operación; valor a verificar).
- **Verificación de firmas**: endpoint para validar la integridad y la cadena de confianza de un documento firmado (`POST /api/v1/documents/{id}/verify`).
- **Modo demostración** (planificado): un único comando que levanta el sistema listo para firmar sin token USB, para que un revisor recorra los flujos sin hardware (ver 1.4).

#### Alcance del MVP

La lista anterior describe el producto completo. El MVP se acota a **un único camino demostrable de punta a punta**, y el resto se construye por hitos:

| Hito | Alcance | Entrega |
|---|---|---|
| **1. MVP** | Cargar un PDF desde el panel (con nombre y CUIL del firmante), firmarlo con el proveedor `local` pasando por el mismo `prepare` / `complete` de la firma diferida, y dejarlo descargable y como versión vigente (v2) sin pisar la v1. API key para el integrador, PostgreSQL, PAdES B-B, auditoría y webhook con un único intento registrado | Entrega 2 (flujo parcial) y Entrega 3 |
| **2. Firma con token** | Firmadoc Agent con SoftHSM (y prueba manual con token físico): listar certificados, validar antes del PIN y firmar el hash | Entrega 3 |
| **Versión 2** | Firma en lote, adaptador de firma remota (mock FirmAR), sellado de tiempo y revocación embebida (B-LT), Web Component, OAuth2 client-credentials, reintentos con backoff de webhooks, gestión de anclas de confianza desde el panel, estados con fecha límite y verificación independiente por endpoint | Fuera del máster |

El panel Angular del MVP es una página mínima («Firmar documento» y listado de documentos) que sirve también como ejemplo de cómo una aplicación Angular embebe el widget.

**Ejemplo de integración desde un sistema host (ej. Angular):** no requiere instalar ningún paquete de Firmadoc — el sistema integrador solo consume la `signing_url` que devuelve la API.

```html
<!-- Opción 1: iframe (recomendada, cero configuración extra) -->
<iframe [src]="signingUrl | safe" width="480" height="760"></iframe>
```
```html
<!-- Opción 2: Web Component in-page -->
<script src="https://firmadoc.example.org/widget.js"></script> <!-- una sola vez -->
<firmadoc-widget signing-url="https://firmadoc.example.org/sign/b3f1c2e0-...#t=eyJ..."></firmadoc-widget> <!-- usa la signing_url que devuelve la API; requiere CUSTOM_ELEMENTS_SCHEMA en el módulo Angular -->
```

### **1.3. Diseño y experiencia de usuario:**

**Estado actual (Entrega 2).** El flujo funciona de punta a punta en el navegador:
1. En el panel, el funcionario ingresa con el token de administración.
2. En «Firmar documento» completa nombre y CUIL del firmante y elige el PDF. El panel valida los datos antes de enviarlos.
3. Al cargar, la API crea la v1 y la solicitud, y el panel muestra el widget embebido con la `signing_url`.
4. El widget muestra el nombre, las páginas, el tamaño, el estado y una vista previa de la primera página. La tarjeta «Firma propia» (proveedor `local`) llama a `prepare` / `complete` y deja el documento en versión v2 descargable; el panel recibe un `postMessage` `firmadoc:signed`.
5. «Descargar original» baja la v1 con su nombre, byte por byte igual a la subida.

![Panel «Firmar documento» con el widget embebido mostrando el PDF cargado](docs/screenshots/panel-firmar.png)

![Validaciones del formulario: CUIL con guiones y archivo que no es PDF](docs/screenshots/panel-validaciones.png)

El widget también funciona fuera del panel, abriendo la `signing_url` directamente. El fragmento `#t=...` desaparece de la barra de direcciones apenas se lee, y una recarga sigue mostrando el documento.

![Widget de firma abierto directamente con un PDF de tres páginas](docs/screenshots/widget-documento.png)

A continuación se describe el flujo objetivo completo. La firma **parte, en general, de cargar un PDF** en la sección «Firmar documento» del panel de administración y se completa con el widget embebido en esa misma página; los sistemas integradores usan el mismo widget dentro de su propia interfaz, con la `signing_url` que devuelve la API.

1. **Cargar el PDF.** Se completan el nombre y el CUIL del firmante (que queda registrado como `Signer`) y se arrastra o se elige uno o varios PDF; con varios se arma la lista (se puede quitar alguno) y se firman en lote con un solo PIN. El original queda como versión v1.
2. **Elegir el método de firma.** Tarjetas con su validez: **firma con token** (firma digital; el widget indica si Firmadoc Agent y el token están conectados), **firma remota** (redirige al servicio) y **firma propia** (demostración, inmediata, firma electrónica sin la presunción legal de la firma digital). Se ve el documento (nombre, páginas, tamaño, estado y vencimiento).
3. **Validar el certificado antes del PIN.** Con el token se elige el certificado (los vencidos aparecen deshabilitados) y Firmadoc valida la cadena de confianza, la vigencia y la revocación; si algo falla lo informa **antes** de pedir el PIN. El agente muestra una ventana con el nombre del titular del certificado y pide el PIN **una sola vez**, aunque sea un lote.
4. **Firmado.** El widget muestra el resultado, avisa al sistema integrador (`postMessage` y webhook) y el documento queda descargable y como nueva versión vigente, sin descargar ni subir nada a mano.
5. **Firma en lote.** Lista de documentos, un solo certificado y un solo PIN; si algún documento falla el resultado es parcial («2 de 3 firmados»), con descarga de los firmados y reintento de los fallidos.
6. **Panel de administración.** Documentos con su origen (individual o lote), versión y vencimiento; detalle como cadena de custodia con línea de tiempo, versiones descargables y datos técnicos; y gestión de sistemas integradores.

### **1.4. Instrucciones de instalación:**

#### Puesta en marcha (estado actual: base de datos, API, widget de firma y panel)

Requisitos: Python 3.12 o superior (probado con 3.14), Node 20 o superior (probado con 24), Docker con Docker Compose y Git. Los comandos son para PowerShell; en Linux o macOS, el entorno virtual se activa con `source .venv/bin/activate`.

```powershell
git clone https://github.com/bv3rgara/AI4Devs-finalproject.git
cd AI4Devs-finalproject
git checkout feature/entrega-2-bbmv

# 1. Variables de entorno: copiar el ejemplo y completar como mínimo
#    FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE (cualquier valor de prueba), FIRMADOC_ADMIN_TOKEN y
#    FIRMADOC_SIGNING_LINK_SECRET (32 caracteres o más; sin él la API no arranca).
#    Para generar valores aleatorios: python -c "import secrets; print(secrets.token_urlsafe(32))"
Copy-Item .env.example .env

# 2. PostgreSQL 16 (crea las bases firmadoc y firmadoc_test)
docker compose up -d db

# 3. Backend: dependencias, migraciones y datos de demostración
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed      # muestra una única vez la API key del sistema integrador demo

# 4. Tests (unitarios y de integración; los de integración usan firmadoc_test, que se migra desde cero en cada corrida)
pytest

# 5. API en http://127.0.0.1:8000 (documentación interactiva en /docs)
uvicorn app.main:create_app --factory --reload

# 6. Widget de firma en http://localhost:5173, en otra consola desde la raíz del repo
cd widget
Copy-Item .env.example .env    # VITE_FIRMADOC_API_URL=http://localhost:8000/api/v1
npm install
npm test                       # tests de Vitest
npm run dev

# 7. Panel de administración en http://localhost:4200, en otra consola desde la raíz del repo
cd frontend
npm install
npm test -- --watch=false      # tests de Vitest
npm start
```

Con los tres procesos levantados, abrir http://localhost:4200, ingresar el `FIRMADOC_ADMIN_TOKEN` del `.env` y cargar un PDF en «Firmar documento». Las URL de la API y del widget que usa el panel están en `frontend/src/environments/`.

El agente local (hito 2) por ahora es un *scaffold*: escucha solo en `127.0.0.1`, rechaza con `403` los orígenes que no están en `FIRMADOC_AGENT_ALLOWED_ORIGINS` y expone `GET /health`. No hace falta para el flujo actual.

```powershell
cd agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
pytest
python -m firmadoc_agent       # http://127.0.0.1:8765/health
```

La API solo acepta peticiones del navegador desde los orígenes de `FIRMADOC_CORS_ORIGINS` (por defecto, el panel en `:4200` y el widget en `:5173`). `FIRMADOC_PUBLIC_BASE_URL` es la URL del widget: con ella la API arma la `signing_url`.

El seed es idempotente y crea: el sistema integrador «Sistema integrador demo» (orígenes permitidos `http://localhost:4200`), el firmante «Firmante Demo» (CUIL `20123456786`) y una PKI de demostración para el proveedor `local`. La PKI se guarda en `backend/var/keys/`, fuera de git: un PKCS#12 cifrado con la passphrase del `.env` y `demo-ca.crt`. Si se define `FIRMADOC_DEMO_API_KEY`, el integrador demo usa esa clave en lugar de generar una.

#### Probar la carga y la descarga con `curl`

Con la API levantada, en otra consola de PowerShell (`curl.exe`, no el alias `curl` de PowerShell). `$token` es el `FIRMADOC_ADMIN_TOKEN` del `.env` y `$apiKey`, la clave que mostró el seed:

```powershell
curl.exe http://127.0.0.1:8000/api/v1/health

# Carga desde el panel (multipart): responde 201 con id, document_id, status y signing_url
curl.exe -X POST http://127.0.0.1:8000/api/v1/admin/signing-uploads `
  -H "Authorization: Bearer $token" `
  -F "file=@resolucion.pdf;type=application/pdf" `
  -F "signer_full_name=Firmante Demo" -F "signer_identifier=20123456786"

# Envío por un sistema integrador (JSON con el PDF en base64)
$pdf = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\resolucion.pdf"))
@{ document_base64 = $pdf; file_name = "resolucion.pdf"; external_document_id = "EXP-1";
   signer = @{ full_name = "Firmante Demo"; identifier = "20123456786" } } | ConvertTo-Json | Set-Content body.json
curl.exe -X POST http://127.0.0.1:8000/api/v1/signature-requests `
  -H "X-API-Key: $apiKey" -H "Content-Type: application/json" --data-binary "@body.json"

# Descarga de la versión original (con el token de administración, la API key del dueño o el token del enlace)
curl.exe -o v1.pdf -H "Authorization: Bearer $token" `
  http://127.0.0.1:8000/api/v1/documents/<document_id>/versions/1/download
```

La `signing_url` lleva el token del enlace en el fragmento (`#t=...`), que el navegador no envía a ningún servidor ni deja en logs. El sistema integrador debe usarla entera: si recorta el fragmento, el widget queda sin credencial. El token vence a las 24 horas.

Para ver el documento en el widget, abrir en el navegador la `signing_url` que devolvió la carga (con la API y `npm run dev` levantados). El widget consulta la solicitud con `GET /api/v1/signature-requests/{id}`, que también admite la API key del integrador dueño (solo para las solicitudes que ese integrador creó; las cargadas desde el panel responden `404`):

```powershell
curl.exe -H "X-API-Key: $apiKey" http://127.0.0.1:8000/api/v1/signature-requests/<id>
```

#### Objetivo para la Entrega final

A medida que se sumen la API, el widget, el panel y el agente, se completará aquí:
- Requisitos adicionales: Node 20+ (para el widget y el panel) y Chrome/Edge (desde Chrome 142, una página pública que llama a `127.0.0.1` pide permiso de acceso a la red local; en equipos administrados se evita con la política `LocalNetworkAccessAllowedForUrls`). El agente local solo hace falta para firmar con token.
- Modo demostración: un único comando que prepara base, carpetas, migraciones y datos semilla, y arranca el sistema listo para firmar sin token USB.
- Base de datos: **PostgreSQL** en todos los entornos (desarrollo, tests y demo), levantado con `docker-compose`. Los PDF se guardan **dentro de la base** (columna `bytea` de `document_version`); no hay object storage en el MVP. Se descartó SQLite porque los triggers que protegen auditoría y versiones, y los campos `jsonb`, dependen de PostgreSQL.
- Carpeta de confianza (`backend/trust/`): certificados raíz y de AC en formato `.crt`, descargados de la fuente oficial de la AC; el panel muestra la huella SHA-256 de cada uno para confirmarla por un canal independiente.
- Agente local (solo para firmar con token): se instala en la PC del firmante (instalador para Windows empaquetado con PyInstaller, distribuible por política de dominio en equipos administrados) y requiere el middleware PKCS#11 del fabricante del token, de la misma arquitectura (32/64 bits) que el agente. En desarrollo se usa SoftHSM en lugar de un token físico. Un comando de diagnóstico lista los certificados del token y verifica que la biblioteca PKCS#11 cargue, sin pedir el PIN.
- Credenciales de prueba y lista de flujos a probar (firma propia, firma con token de software, lote con fallo parcial, certificado rechazado antes del PIN, agente no detectado, verificación, webhook y gestión de integradores): se incluirán con la Entrega 2.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

```mermaid
flowchart TB
    subgraph Cliente["Sistema integrador (ej. gestor documental institucional - Angular)"]
        HostApp["Aplicación host"]
    end

    subgraph PC["PC del usuario"]
        Widget["Widget de firma\n(React, embebido vía iframe / Web Component)"]
        Agent["Firmadoc Agent\n(127.0.0.1, PKCS#11)"]
        USB["Token USB"]
    end

    subgraph Firmadoc["Firmadoc (servicio de firma institucional)"]
        API["Firmadoc API\n(FastAPI)"]
        Auth["Auth de sistemas integradores\n(API key; OAuth2 en v2)"]
        Providers["Capa de adaptadores\n(interfaz SignatureProvider)"]
        TokenP["TokenAgentProvider\n(firma diferida: hash → agente → firma)"]
        Local["LocalPAdESProvider\n(firma electrónica, clave en el servidor)"]
        FirmAR["FirmARProvider\n(mock de firma remota)"]
        Engine["Motor PAdES\n(pyHanko: preparar / completar)"]
        Valid["Validación de confianza\n(cadena, vigencia, CRL/OCSP, CUIL opcional)"]
        Audit["Servicio de auditoría\n(append-only)"]
        Webhook["Despachador de webhooks"]
        Admin["Panel de administración\n(Angular + PrimeNG)"]
        DB[("PostgreSQL")]
    end

    subgraph Externos["Servicios externos"]
        TSA["Servicio de sello de tiempo (TSA)"]
        FirmARReal["FirmAR / firmar.gob.ar\n(futuro, requiere convenio)"]
    end

    HostApp -- "embebe" --> Widget
    Widget -- "REST: preparar / completar" --> API
    Widget -- "hashes a firmar / firmas (localhost)" --> Agent
    Agent -- "PIN local" --> USB
    API --> Auth
    API --> Providers
    Providers --> TokenP
    Providers --> Local
    Providers --> FirmAR
    TokenP --> Engine
    Local --> Engine
    Engine --> Valid
    Engine -- "sello de tiempo" --> TSA
    FirmAR -. "credenciales reales futuras" .-> FirmARReal
    API --> Audit
    API --> Webhook
    Webhook -- "notifica" --> HostApp
    API --> DB
    Admin --> API
```

**Flujo de firma diferida (proveedor `token`):**
1. El widget lista los certificados del token consultando al agente local y envía el elegido a `prepare`.
2. Firmadoc valida el certificado (cadena, vigencia, revocación y, si el cotejo está activado, CUIL = firmante), prepara el PDF con un espacio reservado para la firma, calcula el hash de los atributos firmados y lo guarda como **desafío** de un solo uso, atado a la sesión y con vencimiento.
3. El widget pasa los hashes al agente; el agente muestra la confirmación, pide el PIN una vez y firma cada hash con el token.
4. El widget envía las firmas a `complete`; Firmadoc comprueba que cada una corresponda a un desafío vigente, la incrusta como actualización incremental (PAdES B-B en el MVP; sello de tiempo y revocación embebida, B-LT, en la versión 2), verifica el resultado, registra la nueva versión del documento y dispara el webhook.

El navegador solo transporta mensajes entre ambos lados: **el agente no tiene credenciales ni conexión propia con el servidor**.

**Patrón elegido:** arquitectura por capas con un núcleo de **puertos y adaptadores (hexagonal)** para el mecanismo de firma. El núcleo de la API solo conoce la interfaz `SignatureProvider`, que distingue dos familias: proveedores que **firman un hash** (`token`, `local`: comparten el mismo motor PAdES de preparar/completar, difieren en quién tiene la clave) y proveedores que **reciben el documento completo** (`firmar`: el servicio remoto firma y devuelve el PDF por callback).

**Por qué esta arquitectura:** el requisito central es que Firmadoc sea "un firmador institucional, pero compatible con lo que ya usan todos" (el token USB que los usuarios ya tienen, o un servicio remoto tipo FirmAR). Aislar el mecanismo de firma detrás de un puerto permite:
- Agregar proveedores nuevos sin tocar el núcleo (ej. otro servicio de firma remota en el futuro).
- Testear el núcleo con un proveedor fake y con SoftHSM, sin credenciales reales ni token físico.
- Reemplazar el mock de FirmAR por el servicio real el día que el organismo obtenga el convenio de integración, sin rediseñar nada.

**Costo aceptado:** una capa de abstracción adicional que, para un MVP con un único proveedor, sería sobreingeniería (acá hay tres) y un componente más para instalar y mantener (el agente local), a cambio de poder firmar con el token que ya existe.

**Por qué un agente local para el token:** los navegadores corren en un sandbox que les impide acceder a dispositivos conectados a la PC (como un token USB), y un servidor tampoco puede alcanzarlo; las alternativas históricas (applets Java, extensiones atadas a un navegador) fueron discontinuadas o son frágiles. La solución viable es una aplicación local que accede al token por PKCS#11 y se coordina con el sistema web. Esta es la conclusión a la que llega la literatura: Villanueva y Molinari (2021), *Plataforma de Firma Digital para Aplicaciones Web del Poder Judicial de Río Negro* (JAIIO 50 – SIE), describen un módulo integrador + una API de archivos temporales + un firmador de escritorio Java que firma cientos de documentos con un único PIN. Firmadoc toma ese enfoque y lo generaliza en dos sentidos: es un servicio independiente del sistema y de la tecnología del integrador, con proveedores intercambiables y versionado de documentos; y usa **firma diferida**, de modo que el agente solo firma hashes (superficie mínima, sin descargar documentos a la PC) y toda la validación queda en el servidor.

**Por qué el agente es una aplicación local en Python y no React/Electron:** el agente casi no tiene interfaz (un diálogo de confirmación y el campo de PIN); lo difícil es el acceso al token y los controles de seguridad. La ventana de React solo aportaría peso (un runtime de más de 100 MB) sin resolver eso; se reevaluaría si el agente creciera (bandeja de firmas, historial, actualizaciones automáticas).

### **2.2. Descripción de componentes principales:**

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Firmadoc API | Python 3.12 + FastAPI | Expone la API REST, orquesta solicitudes de firma, autentica sistemas integradores |
| Motor PAdES | `pyHanko` (firma interrumpida: preparar y completar) | Prepara el PDF con espacio reservado, calcula el hash a firmar, incrusta la firma como actualización incremental, agrega sello de tiempo y revocación |
| Validación de confianza | Python (`pyHanko`/`asn1crypto`) | Verifica cadena hasta las anclas de confianza, vigencia, revocación (CRL/OCSP) y, opcionalmente, CUIL del certificado |
| Capa de adaptadores | Python (Protocol/ABC) | Interfaz `SignatureProvider` con `TokenAgentProvider`, `LocalPAdESProvider` y `FirmARProvider` (mock) |
| Firmadoc Agent | Python + biblioteca PKCS#11, empaquetado como app local | Corre en la PC del usuario, escucha solo en `127.0.0.1`; expone dos operaciones (listar certificados y firmar hashes), muestra confirmación y pide el PIN |
| Servicio de auditoría | FastAPI + PostgreSQL | Registra cada evento del ciclo de vida de una firma, de forma inmutable (append-only) |
| Despachador de webhooks | FastAPI (background tasks) | Notifica de forma asíncrona al sistema integrador cuando cambia el estado de una solicitud |
| Widget embebible | React (+ wrapper Web Component) | UI de firma: lista certificados, coordina servidor y agente, muestra el estado |
| Panel de administración | Angular 21 + PrimeNG 21 | Carga de PDF y widget embebido, consulta de auditoría, gestión de sistemas integradores/API keys, certificados y confianza |
| Base de datos | PostgreSQL | Persistencia relacional de todo el dominio |

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

```
firmadoc/
├── backend/
│   ├── app/
│   │   ├── api/              # routers FastAPI (signature_requests, documents, providers, admin)
│   │   ├── core/              # config, seguridad, dependencias
│   │   ├── providers/         # capa de adaptadores
│   │   │   ├── base.py        # interfaz SignatureProvider
│   │   │   ├── token_agent.py # firma diferida con el agente local
│   │   │   ├── local_pades.py # firma electrónica con clave del servidor
│   │   │   └── firmar_mock.py # adaptador FirmAR (mock)
│   │   ├── models/            # modelos SQLAlchemy
│   │   ├── schemas/            # esquemas Pydantic (request/response)
│   │   ├── services/           # pades (preparar/completar), validación, sello de tiempo, auditoría, webhooks
│   │   └── main.py
│   ├── trust/                  # certificados raíz/AC oficiales (.crt) usados como anclas de confianza
│   ├── tests/                  # unitarios + integración (PostgreSQL)
│   ├── alembic/                 # migraciones
│   └── requirements.txt
├── agent/                       # Firmadoc Agent: app local para firmar hashes con token (PKCS#11)
│   ├── firmadoc_agent/          # app.py (FastAPI con OriginGuard), config.py y __main__.py (escucha en 127.0.0.1)
│   ├── tests/
│   ├── diagnostico.py           # (Ticket 4) lista certificados y verifica la biblioteca PKCS#11 sin pedir PIN
│   └── pyproject.toml
├── widget/                      # widget de firma embebible (React + Vite, se sirve en la signing_url)
│   ├── src/                     # link.ts (enlace y token), api.ts, pdfPreview.ts (pdf.js) y componentes
│   └── package.json
├── frontend/                    # panel de administración/auditoría (Angular + PrimeNG)
│   ├── src/app/                 # core/ (token, interceptor, guard), access/ y signing/ («Firmar documento»)
│   ├── src/environments/        # apiUrl, widgetUrl y maxUploadMb
│   └── package.json
├── docs/
│   └── openapi.yaml             # contrato de la API (fuente de verdad, se escribe antes que el código)
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                    # contexto para la IA: stack, carpetas, comandos y convenciones
├── README.md
└── prompts.md                   # registro de uso de IA (raíz del repo, formato oficial)
```

Sigue una separación clásica por capas dentro de `backend/` (API / dominio / infraestructura), con `providers/` aislado explícitamente porque es el punto de extensión más importante del sistema. `widget/` (React) y `frontend/` (Angular + PrimeNG) son dos frontends independientes porque tienen ciclos de vida y audiencias distintas (uno se embebe en sistemas de terceros, el otro es de uso interno); el panel Angular es además el ejemplo de referencia de cómo una aplicación Angular embebe el widget. `agent/` es un proyecto aparte porque se instala en las PC de los usuarios, no en el servidor.

### **2.4. Infraestructura y despliegue**

```mermaid
flowchart LR
    Dev["Entorno local\n(docker-compose)"] --> CI["CI (GitHub Actions)\ntests + build de imágenes"]
    CI --> Registry["Registro de imágenes"]
    Registry --> Demo["Despliegue de demo pública\n(PaaS de contenedores, ej. Render/Fly.io)"]
    Registry -.-> OnPrem["Despliegue institucional\n(infraestructura propia del organismo adoptante)\na validar en cada caso"]
    Demo --> DBcloud[("PostgreSQL gestionado")]
    CI -.-> AgentPkg["Instalador del agente (Windows)\ndistribuido por política de dominio"]
```

Para la entrega del máster: contenedores Docker para los 3 servicios (backend, widget, admin) + PostgreSQL, desplegados en un PaaS de contenedores económico (a confirmar en la Entrega 2/3, candidatos: Render o Fly.io) con URL pública. La demo pública usa el proveedor `local` y un token de software (SoftHSM) para que cualquier revisor pueda recorrer los flujos sin token físico. Para un uso institucional real, dado que se procesan documentos sensibles, el objetivo sería un despliegue **on-premise o en infraestructura propia** del organismo adoptante, donde además el agente se distribuye junto con el middleware del token mediante política de dominio — a validar en cada caso. CI: pipeline de GitHub Actions que corre la suite de tests y construye las imágenes en cada Pull Request.

### **2.5. Seguridad**

- **Autenticación de sistemas integradores**: cada sistema que use Firmadoc se registra y opera con una API key (cabecera `X-API-Key`, guardada solo como hash); OAuth2 client-credentials queda para la versión 2. El widget no acepta solicitudes de un sistema no registrado.
- **Aislamiento del iframe**: cabecera `Content-Security-Policy: frame-ancestors` con lista explícita de orígenes permitidos por sistema integrador (evita clickjacking).
- **Firma diferida**: el PDF no viaja a la PC del usuario y la clave privada del token nunca toca el servidor.
- **Validación de confianza en el servidor**, al firmar y al recibir documentos de terceros: cadena hasta las anclas de `backend/trust/`, vigencia, revocación (CRL/OCSP) e integridad. Las anclas se descargan siempre de la fuente oficial de la AC y su huella SHA-256 se confirma por un canal independiente (una raíz de origen dudoso invalidaría toda la validación).
- **Vinculación de identidad (configurable)**: con `FIRMADOC_REQUIRE_CUIL_MATCH=true`, el CUIL del certificado debe coincidir con el del firmante de la solicitud (`403` si no). Por defecto está desactivada: firma quien tiene el token y su PIN, y el certificado usado queda registrado en la firma y en la auditoría.
- **Desafíos de un solo uso**: el hash que devuelve el token solo se acepta si corresponde a un desafío vigente, no consumido y de esa misma sesión y solicitud.
- **Seguridad del agente local**: escucha únicamente en `127.0.0.1`; acepta pedidos solo de la lista de orígenes permitidos; expone solo dos operaciones (listar certificados y firmar hashes); muestra una confirmación con el nombre del documento antes de firmar; el PIN se ingresa solo en la PC del usuario y el agente nunca lo reintenta por su cuenta (el token se bloquea tras una cantidad de intentos fallidos).
- **Cifrado de claves privadas en reposo**: el keystore del proveedor `local` se cifra (variable de entorno en desarrollo, KMS o equivalente en producción).
- **TLS obligatorio** en tránsito para la API, el widget y los callbacks.
- **Validación estricta del PDF de entrada** (tipo MIME, tamaño máximo, sanitización) para mitigar archivos maliciosos.
- **Auditoría inmutable (append-only)**: la tabla de eventos de auditoría no admite `UPDATE`/`DELETE`, dando trazabilidad de quién firmó qué y cuándo.
- **Rate limiting** por sistema integrador y **principio de menor privilegio**: cada sistema solo ve sus propias solicitudes de firma.
- **Nota de diseño sobre el valor legal (explícita, no un pendiente oculto):** bajo la Ley 25.506 (Argentina), solo una firma hecha con un certificado de una Autoridad Certificante licenciada es **firma digital** con presunción de autoría e integridad. El proveedor `token`, con certificados de una AC licenciada validados contra su cadena, produce firma digital. El proveedor `local` (certificados autofirmados) produce **firma electrónica**, válida pero sin esa presunción: es una decisión consciente para pruebas y demostraciones, no para actos que exijan firma digital.

### **2.6. Tests**

- **Unitarios**: lógica de cada `SignatureProvider` de forma aislada; motor PAdES (preparar/completar); validación de confianza con certificados de prueba (raíz, AC y firmante con CUIL, sin valor legal).
- **Casos de rechazo de la validación**: certificado revocado, de otra AC, vencido, con CUIL que no coincide con el firmante (con el cotejo activado), firma hecha con otra clave y desafío vencido, reutilizado o de otra sesión.
- **Verificación independiente**: el PDF firmado se valida con una herramienta ajena a pyHanko (ej. `pdfsig` de Poppler) y se comprueba que dos firmas sucesivas sobre el mismo PDF no se invalidan entre sí.
- **Integración**: API + PostgreSQL (con testcontainers), flujo completo crear solicitud → preparar → completar → versión nueva → auditoría → webhook.
- **Agente sin hardware**: pruebas del agente y del `TokenAgentProvider` con SoftHSM (PKCS#11 por software), ejecutables en CI.
- **End-to-end**: un sistema integrador de prueba embebe el widget, firma un documento (con SoftHSM) y recibe el webhook de confirmación.
- **Prueba manual documentada** con un token criptográfico USB de referencia : carga de la biblioteca PKCS#11, lectura del certificado, firma de un lote con un solo PIN.
- **Orden de trabajo (tests primero)**: para cada ticket, los tests se escriben antes que el código, empezando por los casos de rechazo del motor de firma. La IA los genera a partir de los criterios Dado/Cuando/Entonces de la sección 5 y del contrato `docs/openapi.yaml`; se revisan a mano antes de implementar y el PDF resultante se verifica con `pdfsig`.

### **2.7. Supuestos y puntos a confirmar**

Decisiones que dependen de datos del organismo o que no pude verificar en fuentes oficiales; se documentan para no darlas por sentadas:
1. **Servicio de sellado de tiempo (TSA):** no está definido cuál se usaría. Sin TSA la firma queda en nivel B-B (válida, sin prueba de fecha); con TSA llega a B-LT.
2. **Ubicación del CUIL en el certificado:** el diseño supone que está en el atributo `serialNumber` con formato "CUIL 20123456789"; se confirma con un certificado real mediante el script de diagnóstico.
3. **Qué AC emitió los certificados de los firmantes** y por tanto qué raíz y AC intermedia hay que cargar como anclas de confianza (existen varias).
4. **Reglas de negocio:** quién firma cada tipo de acto, si hay firma múltiple o secuencial, y qué documentos admiten firma electrónica en lugar de digital.
5. **Firma remota:** requiere un convenio de integración con la autoridad nacional y las credenciales no son de acceso público; el límite de documentos por operación citado en el relevamiento previo no está verificado.
6. **Hardware:** la política de la AC exige dispositivos criptográficos FIPS 140-2 nivel 2 o superior; el agente debe probarse contra los modelos de token realmente entregados. La biblioteca PKCS#11 del fabricante debe coincidir en arquitectura con el Python del agente.
7. **Componentes existentes:** si el organismo ya cuenta con un firmador invocable desde otras aplicaciones, convendría evaluarlo; Firmadoc se propone justamente como servicio neutral y reutilizable por cualquier sistema.

---

## 3. Modelo de Datos

### **3.1. Diagrama del modelo de datos:**

```mermaid
erDiagram
    INTEGRATING_SYSTEM ||--o{ DOCUMENT : "posee"
    INTEGRATING_SYSTEM ||--o{ SIGNATURE_REQUEST : "origina"
    INTEGRATING_SYSTEM ||--o{ SIGNATURE_BATCH : "origina"
    DOCUMENT ||--o{ DOCUMENT_VERSION : "tiene versiones"
    DOCUMENT |o--o| DOCUMENT_VERSION : "versión vigente"
    DOCUMENT ||--o{ SIGNATURE_REQUEST : "se firma mediante"
    SIGNATURE_REQUEST |o--o| DOCUMENT_VERSION : "produce"
    SIGNATURE_REQUEST ||--o{ SIGNING_CHALLENGE : "genera"
    CERTIFICATE |o--o{ SIGNING_CHALLENGE : "se usa en"
    SIGNER ||--o{ SIGNATURE_REQUEST : "firma"
    SIGNER ||--o{ SIGNATURE_BATCH : "firma"
    SIGNER |o--o{ CERTIFICATE : "posee"
    SIGNATURE_REQUEST |o--o{ AUDIT_EVENT : "genera"
    SIGNATURE_REQUEST ||--o{ WEBHOOK_DELIVERY : "notifica via"
    SIGNATURE_REQUEST }o--o| CERTIFICATE : "firmado con"
    SIGNATURE_BATCH |o--o{ SIGNATURE_REQUEST : "agrupa"
    SIGNATURE_BATCH |o--o{ AUDIT_EVENT : "genera"

    INTEGRATING_SYSTEM {
        uuid id PK
        string name
        string api_key_hash
        string allowed_origins "lista separada por comas"
        datetime created_at
    }

    DOCUMENT {
        uuid id PK
        uuid integrating_system_id FK
        string external_document_id "nullable, ID propio del sistema integrador"
        uuid current_version_id FK "nullable, versión vigente"
        enum signing_status "draft | pending_signature | signed"
        datetime signature_deadline "nullable, solo si pending_signature"
        datetime created_at
    }

    DOCUMENT_VERSION {
        uuid id PK
        uuid document_id FK
        int version_number
        enum origin "uploaded | signed"
        uuid signature_request_id FK "nullable, solo si origin=signed"
        enum signature_level "nullable: B-B | B-T | B-LT | B-LTA"
        string file_name "nombre original del archivo"
        bytea content "binario del PDF, guardado en PostgreSQL"
        string document_hash
        datetime created_at
    }

    SIGNATURE_REQUEST {
        uuid id PK
        uuid document_id FK
        uuid integrating_system_id FK
        uuid signer_id FK
        uuid certificate_id FK "nullable"
        uuid batch_id FK "nullable, si forma parte de un lote"
        enum provider "local | token | firmar"
        enum status "pending | signing | signed | failed"
        string callback_url "nullable, URL del webhook de esta solicitud"
        datetime created_at
        datetime signed_at "nullable"
    }

    SIGNING_CHALLENGE {
        uuid id PK
        uuid signature_request_id FK
        uuid certificate_id FK
        string hash_to_sign
        string hash_algorithm "SHA-256"
        string session_ref "sesión del firmante"
        datetime expires_at
        datetime consumed_at "nullable, un solo uso"
        datetime created_at
    }

    SIGNATURE_BATCH {
        uuid id PK
        uuid integrating_system_id FK
        uuid signer_id FK
        enum provider "local | token | firmar"
        enum status "pending | signing | completed | partial_failure | failed"
        datetime created_at
        datetime completed_at "nullable"
    }

    SIGNER {
        uuid id PK
        string full_name
        string identifier "CUIL"
        string email
    }

    CERTIFICATE {
        uuid id PK
        uuid signer_id FK "nullable"
        string subject
        string issuer_subject
        string cuil "nullable"
        string serial_number UK
        enum provider "local | token | firmar"
        enum revocation_status "good | revoked | unknown"
        datetime issued_at
        datetime expires_at
    }

    AUDIT_EVENT {
        uuid id PK
        uuid signature_request_id FK "nullable, exactamente uno de los dos"
        uuid batch_id FK "nullable, exactamente uno de los dos"
        string event_type
        jsonb payload
        datetime created_at
    }

    WEBHOOK_DELIVERY {
        uuid id PK
        uuid signature_request_id FK
        string url
        enum status "pending | delivered | failed"
        int attempts
        datetime last_attempt_at "nullable"
    }
```

### **3.2. Descripción de entidades principales:**

- **IntegratingSystem**: sistema tercero que consume Firmadoc (ej. un gestor documental institucional). `api_key_hash` (not null, único) — nunca se guarda la key en texto plano. `allowed_origins` — orígenes permitidos para embeber el widget y para que el agente acepte pedidos (usado en `frame-ancestors`).
- **Document**: identidad lógica de un documento a lo largo de toda su vida (puede firmarse varias veces). `integrating_system_id` es nulo cuando el documento se cargó desde el panel. `external_document_id` (nullable, único por sistema integrador) permite correlacionarlo con el ID que ya usa el sistema integrador. `current_version_id` apunta siempre a la versión vigente — se actualiza (no se borra ni pisa nada) cada vez que se genera una nueva versión. `signing_status` refleja el ciclo de vida de cara a la firma: `draft` (aún no se puede firmar) → `pending_signature` (listo, opcionalmente con `signature_deadline`) → `signed` (tiene al menos una firma completada). Al vencer el plazo se registra un evento de auditoría y el documento deja de figurar como pendiente (el comportamiento exacto se define con cada sistema integrador). El listado de quiénes firmaron un documento no es un campo propio: se obtiene de sus `SignatureRequest` en estado `signed`.
- **DocumentVersion**: cada versión de un documento, **inmutable y append-only**. `origin` distingue la versión original subida (`uploaded`) de una generada por una firma (`signed`, con `signature_request_id`). `signature_level` indica el nivel PAdES alcanzado (B-LT si hubo sello de tiempo y revocación embebida). `content` guarda el binario del PDF en la propia base (`bytea`) y `file_name` el nombre original, usado al descargar; un documento de varios MB por versión es aceptable para el volumen del MVP, y mover los binarios a object storage queda como evolución posible. Nunca se sobrescribe una versión: solo se agregan nuevas y se actualiza el puntero `Document.current_version_id`.
- **SignatureRequest**: núcleo del flujo de firma. FK a `document_id` (not null) — toda solicitud opera sobre un `Document` (si el integrador no manda un `document_id`, Firmadoc crea el `Document` y su primera `DocumentVersion` `uploaded`). `integrating_system_id` es nulo en las solicitudes creadas desde el panel. `status` transiciona `pending → signing → signed|failed`, y `signed_at` está presente si y solo si el estado es `signed`. `certificate_id` queda nulo hasta que se elige el certificado; `batch_id` se completa si la solicitud forma parte de un lote. `callback_url` (nullable) guarda la URL del webhook que envía el integrador en `POST /signature-requests`; es por solicitud porque un mismo sistema puede querer recibir avisos en endpoints distintos, y las cargas desde el panel no la usan. Al pasar a `signed`, dispara la creación de la `DocumentVersion` resultante, también dentro de un lote.
- **SigningChallenge**: el hash que debe firmar el token para una solicitud, preparado por el servidor. Es de **un solo uso** (`consumed_at`), vence (`expires_at`) y está atado a la sesión del firmante (`session_ref`) y al certificado validado; así `complete` solo acepta firmas que corresponden a lo que el servidor preparó.
- **SignatureBatch**: agrupa N `SignatureRequest` que se firman con una sola confirmación (ej. un solo PIN cubre los N documentos). `status` resume el estado conjunto, pero cada solicitud mantiene el suyo — un lote puede terminar en `partial_failure`.
- **Signer**: persona que firma. Se crea (o se reutiliza por `identifier`) a partir del bloque `signer` de `POST /signature-requests` o de los campos nombre y CUIL del formulario de carga del panel, de modo que toda solicitud tiene un firmante aunque la cargue un administrador. `identifier` (CUIL, not null) se contrasta con el CUIL del certificado solo si `FIRMADOC_REQUIRE_CUIL_MATCH=true`.
- **Certificate**: certificado usado en una firma: propio (`local`), el del token del usuario (`token`; Firmadoc solo registra datos públicos) o del servicio remoto (`firmar`). `cuil` se extrae del certificado; `revocation_status` guarda el resultado de la última consulta de revocación; `serial_number` único.
- **AuditEvent**: tabla append-only con cada evento del ciclo de vida de una `SignatureRequest` o de un `SignatureBatch` (exactamente uno de los dos FK está presente). En el MVP, sin lotes, la migración inicial crea solo `signature_request_id NOT NULL`; `batch_id` y la restricción de exclusividad llegan con `SignatureBatch`. `payload` en `jsonb` guarda el detalle de cada tipo de evento (incluido el resultado de la validación de confianza).
- **WebhookDelivery**: registro de cada intento de notificación al sistema integrador. `url` se copia de `SignatureRequest.callback_url` al momento del envío. En el MVP se hace un único intento (`attempts = 1`); los reintentos con backoff quedan para la versión 2.

---

## 4. Especificación de la API

Firmadoc expone una API REST (FastAPI). El contrato completo está escrito en formato **OpenAPI 3.1** en [`docs/openapi.yaml`](docs/openapi.yaml), que es la fuente de verdad: se escribe antes que el código, la IA genera los esquemas Pydantic y los routers a partir de él, y el OpenAPI que FastAPI expone en `/openapi.json` se compara contra este archivo. Autenticación: los sistemas integradores envían `X-API-Key`; el panel usa `Authorization: Bearer <FIRMADOC_ADMIN_TOKEN>`.

Se resumen aquí los 3 endpoints del flujo principal de firma diferida:

### `POST /api/v1/signature-requests`
Crea una solicitud de firma sobre un documento (existente o nuevo) y devuelve la URL para embeber el widget.

**Request**
```json
{
  "document_base64": "JVBERi0xLjQK...",
  "file_name": "resolucion-0457.pdf",
  "external_document_id": "expediente-2026-00981/doc-7",
  "signer": { "full_name": "Juan Pérez", "identifier": "20123456789", "email": "jperez@example.org" },
  "provider": "token",
  "callback_url": "https://gestor-documental.example.org/webhooks/firmadoc"
}
```
`external_document_id` es opcional (correlaciona con el ID del documento en el sistema integrador). Si el integrador ya le había mandado antes ese documento a Firmadoc, puede omitir `document_base64` y enviar el campo opcional `document_id` que Firmadoc devolvió la primera vez, para firmar una nueva versión del mismo documento sin subirlo de nuevo. `provider` admite `token`, `local` o `firmar`.

**Response `201 Created`**
```json
{
  "id": "b3f1c2e0-...",
  "document_id": "d4a2e9f1-...",
  "status": "pending",
  "signing_url": "https://firmadoc.example.org/sign/b3f1c2e0-...",
  "created_at": "2026-09-02T18:00:00Z"
}
```

### `POST /api/v1/signature-requests/{id}/prepare`
Primer paso de la firma diferida. Recibe el certificado elegido del token (solo la parte pública), lo valida y devuelve el hash que el token debe firmar.

**Request**
```json
{ "certificate_pem": "-----BEGIN CERTIFICATE-----\nMIIF...\n-----END CERTIFICATE-----" }
```
Con el proveedor `local`, `certificate_pem` se omite: el servidor usa su propio certificado y la clave nunca sale de él. Por eso, en `complete` con `local` el campo `signatures` también se omite, y el servidor firma los desafíos que preparó. Así los dos proveedores recorren el mismo `prepare` / `complete`.

**Response `200 OK`**
```json
{
  "challenges": [
    {
      "challenge_id": "c9e1a7b4-...",
      "document_name": "resolucion-0457.pdf",
      "hash_algorithm": "SHA-256",
      "hash_to_sign": "q1w2e3r4t5y6...=="
    }
  ],
  "expires_at": "2026-09-02T18:05:00Z"
}
```
**Errores:** `401` integrador no autenticado; `403` el CUIL del certificado no coincide con el del firmante (solo con `FIRMADOC_REQUIRE_CUIL_MATCH=true`; por defecto no se coteja: firma quien tiene el token y su PIN, y la firma registra el certificado usado); `422` certificado vencido, revocado o de una cadena no confiable (con el motivo en el cuerpo; se informa antes de que el usuario ingrese el PIN).

### `POST /api/v1/signature-requests/{id}/complete`
Segundo paso. Recibe las firmas producidas por el token, las incrusta en el PDF, valida el resultado y registra la nueva versión.

**Request**
```json
{ "signatures": [ { "challenge_id": "c9e1a7b4-...", "signature_base64": "MIIB...==" } ] }
```

**Response `200 OK`**
```json
{
  "id": "b3f1c2e0-...",
  "status": "signed",
  "provider": "token",
  "certificate": { "subject": "CN=Juan Pérez", "serial_number": "..." },
  "document": {
    "id": "d4a2e9f1-...",
    "external_document_id": "expediente-2026-00981/doc-7",
    "version_number": 2,
    "is_active_version": true,
    "signing_status": "signed",
    "signature_level": "B-B",
    "download_url": "https://firmadoc.example.org/documents/d4a2e9f1-.../versions/2/download",
    "signed_document_base64": "JVBERi0xLjQK..."
  }
}
```
**Errores:** `409` el desafío venció, ya fue usado o no pertenece a esa sesión; `422` la firma no verifica contra el hash preparado.

Toda firma completada deja el documento **descargable** (`download_url` / `signed_document_base64`) **y, a la vez, versionado** (`document_id` + `version_number` + `is_active_version: true`), sin que Firmadoc borre ni modifique la versión anterior. El webhook que Firmadoc envía al `callback_url` del integrador lleva este mismo bloque `document`, para que pueda reaccionar sin hacer un `GET` adicional.

### Endpoints adicionales (fuera de los 3 detallados, por el límite recomendado de la plantilla)

- `POST /api/v1/admin/signing-uploads` (MVP, panel): `multipart/form-data` con `file` (PDF), `signer_full_name`, `signer_identifier` (CUIL), `signer_email` opcional y `provider` (`local` en el MVP). Crea el `Signer`, el `Document`, la `DocumentVersion` v1 y la `SignatureRequest`, y devuelve `201` con la misma forma que `POST /signature-requests`. Errores: `401` sin token de administración válido; `422` si el archivo no es un PDF válido o supera `FIRMADOC_MAX_UPLOAD_MB`.
- `GET /api/v1/documents/{id}/versions/{n}/download` (MVP): descarga el binario de una versión con su nombre original.

- `GET /api/v1/signature-requests/{id}`: estado de la solicitud, con el mismo bloque `document` de `complete` cuando ya está firmada, más el historial de eventos de auditoría.
- `POST /api/v1/signature-batches`: recibe un array de documentos (misma forma que `POST /signature-requests`) más un `signer` y `provider` comunes y crea un `SignatureBatch`. `prepare` y `complete` del lote (`/api/v1/signature-batches/{id}/prepare|complete`) devuelven y reciben N hashes/firmas, de modo que el agente firma todos en una sola llamada con un único PIN. `GET /api/v1/signature-batches/{id}` desglosa el estado de cada solicitud (un lote puede terminar en `partial_failure`).
- `PATCH /api/v1/documents/{id}`: cambia `signing_status` (`draft` ↔ `pending_signature`) y fija `signature_deadline`. `GET /api/v1/documents/{id}/signatures`: listado de firmantes (nombre, fecha, certificado, proveedor). `POST /api/v1/documents/{id}/verify`: verifica integridad y cadena de confianza de un documento firmado.
- `POST /api/v1/providers/firmar/callback`: lo consume el servicio de firma remota (mock en el MVP) para notificar que el usuario firmó con su certificado remoto (OTP + PIN en el servicio); replica el contrato de integración de FirmAR/SIU.

**Contrato del agente local** (no es parte de la API de Firmadoc; lo consume el widget en `http://127.0.0.1:{puerto}`): `GET /health` permite al widget detectar si el agente está corriendo y si tiene configurada la biblioteca PKCS#11 (sin revelar su ruta); `GET /certificates` lista los certificados públicos del token; `POST /sign` recibe los hashes y los nombres de los documentos, muestra la confirmación, pide el PIN una vez y devuelve las firmas. Solo acepta pedidos de los orígenes permitidos.

---

## 5. Historias de Usuario

**Historia de Usuario 1 (must-have)**

> Como **funcionario**, quiero **cargar un PDF desde mi navegador y firmarlo en la misma pantalla**, para firmar un documento sin depender de que otro sistema me lo entregue ni descargarlo, firmarlo afuera y volver a subirlo.

Criterios de aceptación:
- **Dado** un administrador autenticado en el panel, **cuando** completa el nombre y el CUIL del firmante y carga un PDF válido en «Firmar documento», **entonces** se registra (o reutiliza) el `Signer`, se guarda como versión original (v1), se crea la solicitud de firma y se muestra el widget embebido con el nombre, las páginas y el tamaño del documento.
- **Dado** que faltan el nombre o el CUIL del firmante, o el CUIL no tiene 11 dígitos, **cuando** intenta cargar, **entonces** se rechaza con `422` y no se guarda nada.
- *(Versión 2, con HU6)* **Dado** que carga varios PDF, **cuando** confirma, **entonces** se crea un lote y se firman con un solo certificado y un solo PIN.
- **Dado** un archivo que no es un PDF válido o que excede el tamaño máximo, **cuando** lo carga, **entonces** se rechaza con un mensaje claro y no se guarda nada (`422` en la API).
- **Dado** que firma, **cuando** termina, **entonces** el documento queda descargable y como nueva versión vigente (v2), y la v1 original se conserva.
- **Dado** un token de administración inválido o ausente, **cuando** se invoca `POST /api/v1/admin/signing-uploads`, **entonces** la respuesta es `401`.

**Variante por sistema integrador (HU 1b, must-have)**

> Como **sistema integrador** (ej. un gestor documental institucional), quiero **enviar un documento PDF ya existente en mi propia base de datos a Firmadoc y recibir una URL de firma embebible**, para ofrecer firma digital a mis usuarios sin salir de mi propia aplicación.

Criterios de aceptación:
- **Dado** un sistema integrador autenticado, **cuando** envía `POST /api/v1/signature-requests` con el PDF y su `external_document_id`, **entonces** recibe `201` con `signing_url`, `document_id` y `status: pending`.
- **Dado** un `document_id` que Firmadoc ya conoce de una firma anterior, **cuando** el integrador crea una nueva solicitud con ese ID, **entonces** esta opera sobre el mismo `Document` sin reenviar el binario.
- **Dado** una API key inválida o ausente, **cuando** se invoca el endpoint, **entonces** la respuesta es `401`.
- **Dado** un archivo que no es un PDF válido o excede el tamaño máximo, **cuando** se invoca el endpoint, **entonces** la respuesta es `422` con el detalle.

**Historia de Usuario 2 (must-have)**

> Como **funcionario con un token de firma digital**, quiero **firmar un documento desde el sistema web con mi token, ingresando el PIN en mi PC**, para firmar con validez de firma digital sin descargar el documento, firmarlo afuera y volver a subirlo.

Criterios de aceptación:
- **Dado** un firmante con el agente instalado y su token conectado, **cuando** abre la `signing_url` y elige su certificado, **entonces** Firmadoc valida la cadena de confianza, la vigencia y la revocación (y, si `FIRMADOC_REQUIRE_CUIL_MATCH=true`, que el CUIL del certificado coincida con el del firmante), y si algo falla lo informa **antes** de pedir el PIN.
- **Dado** un certificado válido, **cuando** el firmante confirma en el diálogo del agente (que muestra el nombre del titular del certificado; los documentos se ven en el widget) e ingresa el PIN, **entonces** el agente firma solo el hash recibido y el servidor incrusta la firma PAdES; el PDF nunca viaja a la PC ni la clave sale del token.
- **Dado** un hash firmado que no corresponde a un desafío vigente (vencido, ya usado o de otra sesión), **cuando** se intenta completar la firma, **entonces** se rechaza con `409`.
- **Dado** una firma completada, **cuando** el servidor la valida, **entonces** se crea una nueva `DocumentVersion` (`origin: signed`) marcada como vigente, la versión anterior **no se modifica ni se elimina**, y el documento queda descargable inmediatamente (`download_url` o `signed_document_base64`).
- **Dado** un PDF que ya tiene la firma de otra persona, **cuando** un segundo funcionario lo firma, **entonces** su firma se agrega como actualización incremental y la anterior sigue siendo válida.

**Historia de Usuario 3 (must-have)**

> Como **sistema integrador**, quiero **recibir una notificación (webhook) cuando el documento fue firmado**, para actualizar mi propio registro automáticamente sin tener que consultar el estado manualmente.

Criterios de aceptación:
- **Dado** una `SignatureRequest` que pasa a `signed` o `failed`, **cuando** cambia el estado, **entonces** Firmadoc invoca el `callback_url` registrado con el resultado y el bloque `document` (descarga y versión).
- **Dado** que el integrador no responde `2xx`, **cuando** falla la entrega, **entonces** el intento queda registrado como `failed` en `WebhookDelivery` sin afectar al estado de la firma. *(Versión 2: reintentos con backoff.)*
- **Dado** cualquier intento de entrega, **cuando** ocurre, **entonces** queda registrado y consultable desde el panel de administración.

**Resto del backlog (documentado, prioridad must/should):**

| # | Historia | Prioridad |
|---|---|---|
| 4 | Como administrador, quiero ver un historial auditable de todas las firmas (quién, cuándo, con qué certificado y con qué resultado de validación) | Must-have |
| 5 | Como evaluador o usuario sin token físico, quiero firmar con el motor propio (firma electrónica) y con un token de software, para recorrer todos los flujos sin hardware | Must-have |
| 6 | Como usuario firmante, quiero firmar varios documentos en un solo lote con una única confirmación y un solo PIN, en vez de repetir el flujo por cada documento | Should-have |
| 7 | Como usuario firmante con certificado remoto, quiero delegar la firma en un servicio de firma remota (ej. FirmAR) desde el mismo widget | Should-have |
| 8 | Como firmante, quiero ver nombre y fecha de cada firmante en el documento firmado por varias personas | Should-have |
| 9 | Como sistema integrador, quiero marcar un documento como pendiente de firma (con fecha límite opcional) y consultar el listado de quiénes lo firmaron | Should-have |
| 10 | Como sistema integrador, quiero verificar la validez de un documento ya firmado mediante un endpoint dedicado | Should-have |
| 11 | Como administrador, quiero gestionar las anclas de confianza y rotar el certificado propio de firma ante un compromiso de seguridad | Should-have |

**Priorización y dependencias:** el versionado (nueva versión vigente sin pisar la anterior) y la descarga son parte de los criterios de aceptación de HU2 y se comparten con todos los proveedores. HU1 es prerequisito de todo (no hay solicitud sin `Document`). HU2 y HU5 comparten el mismo motor de preparar/completar y difieren en quién tiene la clave (el token del usuario o el servidor), por lo que HU5 se construye primero y habilita la demostración y los tests de HU2. HU2 es la de mayor riesgo técnico (agente local, PKCS#11, validación de confianza): se desarrolla con SoftHSM antes de validar con un token físico. HU3 depende de que exista al menos un proveedor funcionando; HU4 depende de los eventos generados por HU1-HU3. Del conjunto de *should-have* (HU6-HU11), que quedan documentados como backlog, solo se implementarán los que alcance el tiempo del MVP, priorizando HU6 por su sinergia con el token (un solo PIN para todo el lote).

**Orden de construcción (ver «Alcance del MVP» en 1.2):** hito 1 = HU1 + HU5 + versionado y descarga, y luego HU3 (webhook con un intento) y HU4 (auditoría); hito 2 = HU2 con SoftHSM; HU1b se expone en la API desde el hito 1 porque reutiliza el mismo servicio de carga. Las *should-have* pasan a la versión 2.

---

## 6. Tickets de Trabajo

Los tres tickets de la plantilla (backend, frontend y base de datos) se detallan abajo. El de backend se divide en cuatro sub-tickets, cada uno implementable y testeable por separado y en el orden indicado. El agente local tiene su propio ticket completo (Ticket 4) porque es la pieza de mayor riesgo. El panel de administración se agregó en la Entrega 2 como Ticket 5.

**Ticket 1 — Backend: flujo de firma diferida (`create` / `prepare` / `complete`)** — épica, 34 h en total

**Ticket 1a — Carga de documentos y versionado** (hito 1)
- **Descripción**: servicio de carga compartido por el panel y por la API de integradores, y descarga de versiones.
- **Tareas**:
  - `POST /api/v1/admin/signing-uploads` (token de administración, multipart con nombre y CUIL del firmante) y `POST /api/v1/signature-requests` (API key, JSON con `document_base64` o `document_id` y `callback_url` opcional), ambos sobre el mismo servicio.
  - Validación del PDF: tipo MIME, cabecera `%PDF`, apertura con `pyHanko`/`pypdf` y tamaño máximo `FIRMADOC_MAX_UPLOAD_MB`.
  - Alta o reutilización del `Signer` por CUIL; creación de `Document`, `DocumentVersion` v1 (`origin: uploaded`, binario en `bytea`) y `SignatureRequest` (`pending`).
  - `GET /api/v1/documents/{id}/versions/{n}/download` con el nombre original del archivo.
- **Criterios de aceptación**: un PDF válido devuelve `201` con `signing_url`; un no-PDF, uno corrupto o uno que excede el tamaño devuelve `422` y no deja filas creadas; sin credenciales devuelve `401`; reutilizar un `document_id` no crea un `Document` nuevo.
- **Estimación**: 7 h.

**Ticket 1b — Motor PAdES y proveedor `local`** (hito 1)
- **Descripción**: implementar la firma diferida con la firma interrumpida de `pyHanko`, usada primero por `LocalPAdESProvider` (la clave está en el servidor) y luego por `TokenAgentProvider`.
- **Tareas**:
  - Interfaz `SignatureProvider` (Protocol) y `LocalPAdESProvider` con un certificado de demostración emitido por una CA de prueba generada en el seed.
  - `prepare`: reservar espacio de firma (16–32 KB), calcular el hash de los atributos firmados y guardar el `SigningChallenge` (un solo uso, `expires_at`, atado a `session_ref`).
  - `complete`: verificar el desafío, firmar el hash con la clave local (o recibir la firma del agente en el hito 2), incrustarla como actualización incremental, crear la `DocumentVersion` `signed`, mover `Document.current_version_id` y pasar a `signed`. Nivel PAdES B-B (sin TSA en el MVP).
- **Criterios de aceptación**: el PDF resultante pasa `pdfsig` sin errores de integridad; la v1 queda intacta (mismo hash); reutilizar o usar un desafío vencido devuelve `409`; una segunda firma sobre la v2 no invalida la primera.
- **Estimación**: 12 h.

**Ticket 1c — Validación de confianza** (hito 2, la necesita `token`)
- **Tareas**: cadena hasta las anclas de `backend/trust/`, vigencia, revocación (CRL/OCSP con tiempo de espera y resultado `unknown` si no responde), y cotejo del CUIL solo con `FIRMADOC_REQUIRE_CUIL_MATCH=true`. Resultado de la validación guardado en el `payload` de auditoría.
- **Criterios de aceptación**: certificados de prueba vencido, revocado o de otra CA devuelven `422` con el motivo; con el cotejo activado, un CUIL distinto devuelve `403`; con el cotejo desactivado, el mismo caso firma y registra el certificado usado.
- **Estimación**: 9 h.

**Ticket 1d — Auditoría y webhook** (hito 1, al final)
- **Tareas**: eventos `created`, `prepared`, `signed` y `failed` en `audit_event`; al pasar a `signed` o `failed`, un único `POST` en segundo plano al `callback_url` de la solicitud (si existe) con el bloque `document`, registrado en `webhook_delivery`.
- **Criterios de aceptación**: cada transición deja exactamente un evento; un integrador que responde `500` deja la entrega como `failed` y la firma sigue como `signed`; una solicitud sin `callback_url` no genera entregas.
- **Estimación**: 6 h.

**Ticket 2 — Frontend: widget embebible de firma (React, iframe)**

- **Descripción**: construir la SPA React que se sirve en `signing_url` y que un sistema integrador embebe vía `<iframe>`, y que coordina el servidor con el agente local.
- **Tareas (hito 1, sin agente)**:
  - Vista del documento (nombre, páginas, tamaño) y tarjeta de método «Firma propia» (firma electrónica, aviso de que no tiene presunción legal).
  - Orquestación `prepare` → `complete` con el proveedor `local`, con estados "preparando", "firmando", "firmado" y "error", y botón de descarga de la versión firmada.
  - Comunicación `postMessage` con la ventana padre al completar (`{ type: "firmadoc:signed", document }`).
  - Cabecera `frame-ancestors` generada a partir de `allowed_origins` del integrador.
- **Tareas (hito 2, con agente)**: tarjeta «Firma con token», detección del agente, selección de certificado (`GET /certificates`), errores claros (agente no instalado, token ausente, certificado rechazado antes del PIN) y el paso intermedio al agente `/sign`.
- **Criterios de aceptación**: embebido en la página Angular del panel, el flujo «Firma propia» termina en "firmado" dentro del iframe sin recargar la página padre y el panel recibe el `postMessage`; en el hito 2, el mismo flujo funciona con SoftHSM.
- **Estimación**: 6 h (hito 1) + 6 h (hito 2).

**Ticket 3 — Base de datos: esquema inicial con Alembic**

- **Descripción**: modelar y migrar en **PostgreSQL** el esquema del MVP (`IntegratingSystem`, `Signer`, `Document`, `DocumentVersion`, `SignatureRequest`, `SigningChallenge`, `Certificate`, `AuditEvent`, `WebhookDelivery`). `SignatureBatch` y los campos de fecha límite se agregan en una migración posterior (versión 2).
- **Tareas**:
  - Definir modelos SQLAlchemy con las relaciones y restricciones de la sección 3, incluidos `document_version.content` (`bytea`) y `signature_request.callback_url`.
  - Migración inicial Alembic + script de seed idempotente (un sistema integrador de prueba con su API key mostrada una sola vez, un firmante demo, la CA de prueba y el certificado del proveedor `local`).
  - Restricción a nivel de base de datos que impida `UPDATE`/`DELETE` sobre `audit_event` y `document_version` (trigger o rol de aplicación sin esos permisos).
  - Índice único por `(document_id, version_number)` en `document_version` y restricción de un solo uso sobre `signing_challenge.consumed_at`.
- **Criterios de aceptación**: `alembic upgrade head` sobre un PostgreSQL vacío crea el esquema completo y `alembic downgrade base` lo elimina; un intento de `UPDATE`/`DELETE` sobre `audit_event` o `document_version` falla explícitamente; actualizar `Document.current_version_id` no requiere tocar ninguna fila de `document_version`; ejecutar el seed dos veces no duplica datos.
- **Estimación**: 7 h.

**Ticket 4 — Agente local (Firmadoc Agent)** (hito 2)

- **Descripción**: aplicación local en Python que el widget usa para firmar hashes con el token del usuario por PKCS#11, sin credenciales ni conexión propia con el servidor.
- **Tareas**:
  - Servidor HTTP que escucha solo en `127.0.0.1:{FIRMADOC_AGENT_PORT}`, con CORS limitado a los orígenes configurados y rechazo explícito del resto.
  - `GET /certificates`: lista los certificados públicos del token (PEM, titular, emisor y vencimiento) sin pedir el PIN.
  - `POST /sign`: recibe hasta N hashes SHA-256 con el nombre de cada documento, muestra una ventana nativa siempre al frente con el titular y los documentos, pide el PIN una vez, firma cada hash y devuelve las firmas. Ante un PIN incorrecto devuelve el error y no reintenta.
  - Biblioteca PKCS#11 configurable (`FIRMADOC_PKCS11_LIB`), SoftHSM en desarrollo y CI.
  - `diagnostico.py`: verifica que la biblioteca cargue, lista slots y certificados y muestra la arquitectura (32/64 bits), sin pedir el PIN.
  - Empaquetado para Windows con PyInstaller (sin instalador MSI en el MVP).
- **Criterios de aceptación**: con SoftHSM, `GET /certificates` devuelve el certificado de prueba; una firma devuelta por `/sign` es aceptada por `complete` y el PDF pasa `pdfsig`; una petición desde un origen no permitido devuelve `403`; un PIN incorrecto no dispara un segundo intento; el diagnóstico corre sin token y sin pedir el PIN. Prueba manual documentada con un token físico.
- **Estimación**: 14 h.

**Ticket 5 — Panel de administración: «Firmar documento» (Angular + PrimeNG)** (hito 1)

- **Descripción**: crear el panel en `frontend/` (Angular 21 + PrimeNG 21) con su primera sección real. Un funcionario ingresa con el token de administración, carga un PDF con los datos del firmante y ve el widget embebido en la misma pantalla. Es la cara de HU1 en el navegador.
- **Tareas**:
  - Scaffold Angular con componentes standalone, rutas `/acceso` y `/firmar` (cargadas de forma diferida), PrimeNG con el tema Aura y `environments` con `apiUrl`, `widgetUrl` y `maxUploadMb`.
  - Acceso: el token de administración se guarda en `sessionStorage`; un interceptor agrega `Authorization: Bearer` solo a las llamadas a la API y, ante un `401`, borra el token y vuelve al acceso. Un guard protege `/firmar` y hay un botón «Salir».
  - Formulario tipado con nombre, CUIL (11 dígitos, sin guiones), email opcional y un PDF de hasta `maxUploadMb`, con «Cargar» deshabilitado mientras sea inválido.
  - Carga multipart a `POST /api/v1/admin/signing-uploads` y resultado con el widget en un iframe. La `signing_url` se marca como confiable solo si empieza con `widgetUrl`. Incluye «Descargar original» (blob con el nombre de `Content-Disposition`) y «Cargar otro documento».
  - Errores de la API en lenguaje claro: `invalid_pdf`, `file_too_large`, `validation_error` marcado en su campo, y API no disponible.
- **Criterios de aceptación**: sin token no se ve «Firmar documento»; un `401` vuelve al acceso con «El token de administración no es válido»; un CUIL con guiones o un archivo que no es PDF muestran su mensaje y no permiten cargar; una carga válida muestra el widget con el documento; «Descargar original» guarda un archivo con el mismo SHA-256 que el subido; ante un error de la API el formulario conserva los datos.
- **Estimación**: 8 h.

---

## 7. Pull Requests

_Pendiente — se completará con los Pull Requests de la Entrega 2 y la Entrega final._

---

## 8. Seguimiento en Jira

Este apartado documenta cómo quedó registrado en Jira el backlog de Firmadoc (noviembre 2026). Si el estado del código avanza, conviene actualizar Jira y sincronizar [docs/jira-backlog.md](docs/jira-backlog.md).

### 8.1. Accesos

| Recurso | URL |
|---|---|
| Tablero activo | https://vergara-bruno.atlassian.net/jira/software/projects/SCRUM/boards/1 |
| Backlog | https://vergara-bruno.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog |
| Épica contenedora | https://vergara-bruno.atlassian.net/browse/SCRUM-1 |

### 8.2. Convenciones

- **Etiqueta común:** `firmadoc` en todas las incidencias.
- **Tipos:** `Epic` (contenedor), `Historia` (HU), `Tarea` (tickets de implementación del readme §6), `Subtask` (sub-tickets 1a–1d bajo Ticket 1).
- **Story Points:** en este proyecto se cargaron con el mismo valor que las **horas estimadas** del readme §6 (campo *Story point estimate* en Jira).
- **Prioridad en Jira:** las HUs *must-have* llevan etiqueta `must-have`; las *should-have* (HU6–HU11), `should-have`. Los hitos llevan `hito-1` o `hito-2` cuando aplica.

### 8.3. Sprint activo (al registrar el backlog)

| Campo | Valor |
|---|---|
| Nombre | **SCRUM Sprint 1** |
| Meta | Firmadoc MVP hito 1: backlog registrado; cierre 1d y avance hito 2 (agente/token) |
| Inicio | 18-nov-2026 |
| Fin | 02-dic-2026 |
| Ámbito | Las 22 incidencias (`SCRUM-1` … `SCRUM-22`) |

### 8.4. Trazabilidad: Historias de usuario (readme §5 → Jira)

| HU (readme) | Clave Jira | Resumen | Estado en Jira (nov 2026) |
|---|---|---|---|
| HU1 | [SCRUM-2](https://vergara-bruno.atlassian.net/browse/SCRUM-2) | Cargar PDF y firmar en el panel | Finalizada |
| HU1b | [SCRUM-4](https://vergara-bruno.atlassian.net/browse/SCRUM-4) | Integrador: PDF + `signing_url` | Finalizada |
| HU2 | [SCRUM-3](https://vergara-bruno.atlassian.net/browse/SCRUM-3) | Firmar con token USB | Por hacer |
| HU3 | [SCRUM-6](https://vergara-bruno.atlassian.net/browse/SCRUM-6) | Webhook al firmar o fallar | Por hacer |
| HU4 | [SCRUM-5](https://vergara-bruno.atlassian.net/browse/SCRUM-5) | Historial auditable | Por hacer |
| HU5 | [SCRUM-7](https://vergara-bruno.atlassian.net/browse/SCRUM-7) | Firma electrónica / motor propio | Finalizada |
| HU6 | [SCRUM-11](https://vergara-bruno.atlassian.net/browse/SCRUM-11) | Firma en lote | Por hacer (should-have) |
| HU7 | [SCRUM-10](https://vergara-bruno.atlassian.net/browse/SCRUM-10) | Firma remota (FirmAR) | Por hacer (should-have) |
| HU8 | [SCRUM-9](https://vergara-bruno.atlassian.net/browse/SCRUM-9) | Firmantes en PDF multipersona | Por hacer (should-have) |
| HU9 | [SCRUM-8](https://vergara-bruno.atlassian.net/browse/SCRUM-8) | Pendientes y listado | Por hacer (should-have) |
| HU10 | [SCRUM-12](https://vergara-bruno.atlassian.net/browse/SCRUM-12) | Verificar PDF firmado (API) | Por hacer (should-have) |
| HU11 | [SCRUM-13](https://vergara-bruno.atlassian.net/browse/SCRUM-13) | Anclas de confianza y rotación | Por hacer (should-have) |

Todas las historias cuelgan de la épica **SCRUM-1** (campo *parent* en un proyecto team-managed).

### 8.5. Trazabilidad: Tickets de trabajo (readme §6 → Jira)

| Ticket (readme) | Clave Jira | Puntos (= h) | Estado en Jira (nov 2026) |
|---|---|---:|---|
| Ticket 1 (épica backend) | [SCRUM-14](https://vergara-bruno.atlassian.net/browse/SCRUM-14) | 34 | En curso |
| → 1a Carga y versionado | [SCRUM-15](https://vergara-bruno.atlassian.net/browse/SCRUM-15) *subtask* | 7 | Finalizada |
| → 1b PAdES / `local` | [SCRUM-16](https://vergara-bruno.atlassian.net/browse/SCRUM-16) *subtask* | 12 | Finalizada |
| → 1c Validación de confianza | [SCRUM-22](https://vergara-bruno.atlassian.net/browse/SCRUM-22) *subtask* | 9 | Por hacer |
| → 1d Auditoría y webhook | [SCRUM-21](https://vergara-bruno.atlassian.net/browse/SCRUM-21) *subtask* | 6 | Por hacer |
| Ticket 2 — Widget React | [SCRUM-20](https://vergara-bruno.atlassian.net/browse/SCRUM-20) | 12 | En curso (hito 1 listo; agente pendiente) |
| Ticket 3 — Base de datos | [SCRUM-17](https://vergara-bruno.atlassian.net/browse/SCRUM-17) | 7 | Finalizada |
| Ticket 4 — Firmadoc Agent | [SCRUM-19](https://vergara-bruno.atlassian.net/browse/SCRUM-19) | 14 | En curso (scaffold) |
| Ticket 5 — Panel Angular | [SCRUM-18](https://vergara-bruno.atlassian.net/browse/SCRUM-18) | 8 | Finalizada |

### 8.6. Relación HU ↔ tickets (referencia rápida)

| Tickets principales | Historias que cubren |
|---|---|
| 1a, 5, 2 (visor), 1b | HU1, HU1b, HU5 |
| 1c, 4, 2 (token) | HU2 |
| 1d | HU3, HU4 |
| Backlog v2 | HU6–HU11 |

Al cerrar un ticket en el repositorio (OpenSpec / merge), conviene mover la incidencia en Jira y anotar el commit o PR en la descripción o en un comentario de la clave correspondiente.
