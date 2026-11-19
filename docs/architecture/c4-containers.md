# C2 — Diagrama de contenedores (C4)

Contenedores **desplegables** del MVP y su comunicación. Equivalente refinado al diagrama de [readme §2.1](../../readme.md#21-diagrama-de-arquitectura).

```mermaid
flowchart TB
    subgraph cliente["Cliente"]
        HostApp["Sistema host\n(Angular u otro)"]
        Browser["Navegador"]
    end

    subgraph pc["PC del firmante"]
        Agent["Firmadoc Agent\nPython, 127.0.0.1"]
        Token["Token USB / SoftHSM"]
    end

    subgraph firmadoc["Firmadoc — despliegue servidor"]
        API["Firmadoc API\nFastAPI :8000"]
        Widget["Widget de firma\nReact/Vite :5173"]
        AdminFE["Panel administración\nAngular :4200"]
        DB[("PostgreSQL 16")]
    end

    HostApp -->|"iframe signing_url"| Widget
    Browser --> Widget
    AdminFE -->|"REST + multipart"| API
    Widget -->|"REST prepare/complete\nX-Signing-Token"| API
    HostApp -->|"REST X-API-Key"| API
    Widget -->|"GET /certificates, POST /sign\nsolo localhost"| Agent
    Agent --> Token
    API --> DB
    API -.->|"webhook callback_url"| HostApp
```

## Responsabilidades por contenedor

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
| Firmadoc API | FastAPI, Python 3.12 | Intake, firma diferida, versionado, auth, (futuro) auditoría/webhook |
| Widget | React + Vite | UI de firma embebible; orquesta API y agente |
| Panel | Angular 21 + PrimeNG 21 | Carga desde navegador, token admin, iframe del widget |
| Firmadoc Agent | FastAPI + PKCS#11 | Listar certs y firmar hashes; PIN solo en desktop |
| PostgreSQL | 16 | Datos transaccionales, PDF en `bytea`, auditoría append-only |

## Autenticación entre contenedores

| Origen → API | Mecanismo |
|---|---|
| Integrador → API | `X-API-Key` |
| Panel → API | `Authorization: Bearer` |
| Widget → API | `X-Signing-Token` (fragmento `#t=` del enlace) |
| Widget → Agent | Solo orígenes permitidos; sin credenciales de servidor |

Contrato HTTP: [openapi.yaml](../openapi.yaml).