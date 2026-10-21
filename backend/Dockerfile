FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Dependencies are installed at build time, from the lockfile, never at container start.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen

COPY app ./app
COPY alembic ./alembic
COPY tests ./tests
COPY scripts ./scripts
COPY alembic.ini ./

RUN useradd --system --uid 10001 adops360
USER adops360

EXPOSE 8000

# nginx serves the API under /api and strips the prefix; root-path keeps the OpenAPI docs consistent.
# Migrations are not run here: they are an explicit deployment step.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--root-path", "/api", "--proxy-headers", "--forwarded-allow-ips", "*"]
