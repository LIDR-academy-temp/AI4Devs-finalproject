FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

WORKDIR /srv/backend

COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir "uv==0.13.6" \
    && uv sync --frozen --no-dev --no-install-project

COPY app ./app
COPY herramientas ./herramientas
COPY migraciones ./migraciones
COPY alembic.ini ./
RUN uv sync --frozen --no-dev --no-editable \
    && useradd --system --no-create-home weathertrack

ENV PATH="/srv/backend/.venv/bin:$PATH"
USER weathertrack
