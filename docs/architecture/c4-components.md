# C3 — Diagrama de componentes (C4)

Componentes **dentro del contenedor Firmadoc API** (`backend/`). Patrón **hexagonal**: núcleo + puerto `SignatureProvider`.

```mermaid
flowchart TB
    subgraph api_layer["Capa API — app/api/"]
        RHealth["health"]
        RAdmin["admin"]
        RSig["signature_requests"]
        RDoc["documents"]
    end

    subgraph core["Núcleo — app/core/"]
        Auth["auth.py\n(require_* )"]
        Errors["errors.py"]
        Config["config.py"]
    end

    subgraph services["Servicios — app/services/"]
        Intake["intake"]
        LocalSign["local_signing"]
        ReqStatus["request_status"]
        PdfVal["pdf_validation"]
        Links["signing_links"]
        DemoPki["demo_pki"]
    end

    subgraph providers["Proveedores — app/providers/"]
        Port["SignatureProvider\n(Protocol)"]
        LocalPAdES["LocalPAdESProvider"]
        Engine["pades_engine"]
        TokenP["TokenAgentProvider\n(hito 2)"]
    end

    subgraph infra["Infraestructura"]
        ORM["app/models/"]
        DB[("PostgreSQL")]
    end

    RAdmin --> Intake
    RSig --> Intake
    RSig --> LocalSign
    RSig --> ReqStatus
    RSig --> Links
    Intake --> PdfVal
    LocalSign --> LocalPAdES
    LocalPAdES --> Engine
    LocalPAdES --> Port
    TokenP -.-> Port
    services --> Auth
    api_layer --> services
    services --> ORM
    ORM --> DB
```

## Frontends (referencia C3 fuera del API)

| Contenedor | Componentes clave |
|---|---|
| `widget/` | `App`, `DocumentCard`, `SigningMethods`, cliente API |
| `frontend/` | `access`, `sign-document`, `authInterceptor`, `signing-upload.service` |
| `agent/` | `create_app`, `OriginGuard`, rutas `/health`, `/certificates`, `/sign` |

## Extensiones previstas

- **Ticket 1c:** validación de confianza enlazada a `prepare` (`token`).
- **Ticket 1d:** emisión de `audit_event` y cliente de webhook desde servicios de firma.