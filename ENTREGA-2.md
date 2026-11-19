# Entrega 2 — Cómo evaluar Firmadoc

Guía corta para quien corrige el proyecto. Detalle de instalación: [readme.md §1.4](readme.md#14-instrucciones-de-instalación).

## Datos de entrega

| Campo | Valor |
|---|---|
| Repositorio | https://github.com/bv3rgara/AI4Devs-finalproject |
| **Rama a evaluar** | `feature/entrega-2-bbmv` |
| Contrato API | [docs/openapi.yaml](docs/openapi.yaml) |
| Arquitectura | [docs/architecture/](docs/architecture/README.md), [docs/adr.md](docs/adr.md) |
| Uso de IA (prompts, criterio humano) | [prompts.md](prompts.md) |

En el formulario del máster, el autor indica el **`FIRMADOC_ADMIN_TOKEN`** de demostración (mismo string que debe configurarse en `.env`; no está en el repositorio).

## Requisitos

- Docker + Docker Compose  
- Python 3.12+  
- Node.js 20+  
- Git  
- Navegador (Chrome o Edge)

El **agente local** (`agent/`) no hace falta para esta demo: el flujo usa **firma propia** (proveedor `local`).

## Arranque (resumen)

```powershell
git clone https://github.com/bv3rgara/AI4Devs-finalproject.git
cd AI4Devs-finalproject
git checkout feature/entrega-2-bbmv

Copy-Item .env.example .env
# Completar en .env (obligatorio para que arranque la API):
#   FIRMADOC_SIGNING_LINK_SECRET  (>= 32 caracteres)
#   FIRMADOC_ADMIN_TOKEN          (el declarado en la entrega)
#   FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE  (cualquier valor de prueba)

docker compose up -d db

# Terminal 1 — API
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:create_app --factory --reload

# Terminal 2 — Widget (desde raíz del repo)
cd widget
Copy-Item .env.example .env
npm install
npm run dev

# Terminal 3 — Panel (desde raíz del repo)
cd frontend
npm install
npm start
```

URLs: API `http://127.0.0.1:8000` (Swagger `/docs`), widget `http://localhost:5173`, panel `http://localhost:4200`.

## Flujo E2E a probar (≈ 3 minutos)

1. Abrir **http://localhost:4200** e ingresar el token de administración de la entrega.  
2. Ir a **Firmar documento**.  
3. Completar **nombre** (ej. `Firmante Demo`), **CUIL** `20123456786` (11 dígitos, sin guiones), elegir un **PDF** válido.  
4. **Cargar** → debe aparecer el widget en el iframe (nombre, páginas, tamaño, vista previa).  
5. En el widget: tarjeta **Firma propia** → **Firmar** → estado de éxito y opción de descarga de la versión firmada.  
6. Opcional: **Descargar original** y comprobar que coincide con el archivo subido.

Capturas de referencia: [docs/screenshots/](docs/screenshots/).

## Tests automatizados (opcional)

```powershell
# Backend (desde backend/ con venv activo y docker db)
pytest

# Widget
cd widget && npm test

# Panel
cd frontend && npm test -- --watch=false
```

## Qué queda fuera de esta entrega

- Firma con **token USB** / Firmadoc Agent (hito 2)  
- **Webhook** y auditoría completa (ticket 1d)  
- Despliegue público en PaaS (Entrega 3)

## Problemas frecuentes

| Síntoma | Revisar |
|---|---|
| La API no inicia | `FIRMADOC_SIGNING_LINK_SECRET` con al menos 32 caracteres |
| 401 en el panel | Mismo token en `.env` y en pantalla de acceso |
| Error CORS / widget sin datos | API, widget y panel los tres levantados; `FIRMADOC_CORS_ORIGINS` en `.env.example` |
| 409 al firmar | Ejecutar `alembic upgrade head` + seed; backend con último código de la rama |