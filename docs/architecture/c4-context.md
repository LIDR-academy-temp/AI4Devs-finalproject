# C1 — Diagrama de contexto (C4)

Firmadoc como **servicio de firma institucional** consumido por sistemas del organismo y por funcionarios en el navegador.

```mermaid
flowchart TB
    subgraph firmante["Personas"]
        Funcionario["Funcionario / firmante"]
        Admin["Administrador del servicio"]
    end

    subgraph organismo["Organismo"]
        Host["Sistema integrador\n(gestor documental, expediente, etc.)"]
        Panel["Panel Firmadoc\n(Angular, uso interno)"]
    end

    subgraph firmadoc_sys["Firmadoc"]
        Firmadoc["Servicio Firmadoc\n(firma digital institucional)"]
    end

    subgraph externos["Externos (opcional / v2)"]
        AC["Autoridad certificante\n(cadena de confianza)"]
        FirmAR["Servicio de firma remota\n(ej. firmar.gob.ar)"]
        TSA["Sellador de tiempo (TSA)"]
    end

    Funcionario -->|"usa token USB + PIN"| Firmadoc
    Funcionario -->|"embebido en iframe"| Host
    Admin -->|"carga PDF y prueba firma"| Panel
    Host -->|"API key, callback"| Firmadoc
    Panel -->|"Bearer admin"| Firmadoc
    Firmadoc -->|"valida certificados"| AC
    Firmadoc -.->|"proveedor remoto (v2)" .-> FirmAR
    Firmadoc -.->|"B-LT (v2)" .-> TSA
```

## Notas

- El **sistema integrador** no instala librerías de Firmadoc: recibe `signing_url` y embebe el widget.
- El **token USB** no es un sistema de software; el acceso es vía **Firmadoc Agent** en la PC del firmante (ver C2).
- Detalle narrativo: [readme §1.2 y §2.1](../../readme.md#21-diagrama-de-arquitectura).