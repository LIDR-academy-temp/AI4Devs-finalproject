# Design

## Context

Ver `proposal.md`, sección Why. El worker es el único servicio con `env_file`: lo necesita para recibir `SAT2_CLAVE_PRIVADA` y las credenciales de respaldo, que la API nunca debe ver (ADR-0004). Se lee con `format: raw` para que las claves no se interpreten.

## Goals / Non-Goals

**Goals:**

- Ninguna pila aislada del repositorio carga el `.env` real.
- La instalación real funciona igual, sin variables nuevas.

**Non-Goals:**

- Cambiar cómo la instalación real recibe sus claves.
- Proteger pilas que alguien levante a mano con `-p` sin seguir la guía. La guía y `CLAUDE.md` explican cómo hacerlo.

## Decisions

### D1. Ruta del `env_file` en una variable

`path: ${ARCHIVO_ENV:-.env}`, con `required: false`. Sin la variable no cambia nada para la instalación real.

**Alternativas descartadas:**

- **Pasar las claves al worker con `environment`.** Las pondría en la salida de `docker compose config` de cualquier proyecto, y `format: raw` dejaría de proteger su contenido.
- **Detectar el nombre del proyecto en Compose.** La interpolación no tiene una forma fiable de saber si el proyecto es el real.

### D2. Cada pila aislada fija su archivo

| Pila | `ARCHIVO_ENV` |
|---|---|
| Pruebas de extremo a extremo (`pila.ts`) | `.env.example` |
| Pruebas negativas | El archivo descartable que ya arma la herramienta (`seg.env`), con sus claves descartables |
| Copia de prueba con datos reales | `.env.example`: la copia corre en modo prueba y no consulta SAT2 |
| Guía de verificación local | `.env.example` |

### D3. Pruebas que lo sostienen

- **`test_configuracion_compose.py`:** sobre una copia temporal de Compose, comprueba que el worker lea `.env` por defecto y el archivo de `ARCHIVO_ENV` cuando se fija.
- **Prueba de las herramientas:** cada archivo que llama a `docker compose -p` con un proyecto que no es el real (`pila.ts`, `pruebas_negativas.py`, `preparar_copia_de_prueba.py` y la guía de verificación local) tiene que mencionar `ARCHIVO_ENV`. Si falta, la prueba lo nombra.

### D4. Verificación en vivo, sin leer secretos

Una pila aislada con `ARCHIVO_ENV=.env.example` comprueba dentro del worker que `SAT2_CLAVE_PRIVADA` y las credenciales de SAT2 están vacías, e imprime solo «vacía». Nunca se ejecuta `docker compose config` sobre la carpeta del repositorio, porque incluiría el contenido del `.env`.

## Risks / Trade-offs

- **[Riesgo]** Alguien levanta una pila con `-p` a mano y olvida `ARCHIVO_ENV`. → **Mitigación:** la regla queda en `CLAUDE.md`, en la guía de verificación y en las instrucciones de Copilot. Para el asistente, la regla es obligatoria.
- **[Trade-off]** Es una variable más que recordar en las verificaciones manuales. Se acepta a cambio de no tocar la instalación real.
