---
applyTo: ".github/workflows/**"
---

# Revisión de los flujos de GitHub Actions

El pipeline protege `main` y corre sobre un repositorio público. Sus reglas están en el ADR-0003 (`docs/decisions/0003-pipeline-de-integracion-continua.md`).

- **Acciones fijadas por SHA.** Cada `uses:` de una acción de terceros va con el SHA completo del commit y la versión en un comentario, por ejemplo `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`. Señalar como **Bloqueante** una referencia por etiqueta (`@v4`) o por rama (`@main`). Lo mismo para las imágenes de contenedor: van por digest `@sha256:`.
- **Sin secretos.** El pipeline no usa `secrets.*` ni credenciales de SAT2. Señalar cualquier secreto nuevo, aunque parezca inofensivo.
- **Sin `pull_request_target`.** Es **Bloqueante**: da permisos de escritura y secretos a código de forks.
- **Permisos mínimos.** El flujo declara `permissions: contents: read`. Señalar un permiso de escritura nuevo y pedir el motivo.
- **Inyección en `run:`.** Señalar `${{ github.event.* }}` (títulos, ramas, cuerpos de pull request) interpolado directamente en un script; debe pasar por una variable de entorno.
- **Controles exigidos.** Los 8 trabajos (Backend, Frontend, Contrato de la API, Especificaciones de OpenSpec, Secretos en el historial, Dependencias vulnerables, Extremo a extremo y Pruebas negativas) son controles exigidos en la regla de `main`. Si un pull request renombra o borra uno, señalar que hay que actualizar la regla.
- **Gitleaks.** Nunca se desactiva el escaneo. Un falso positivo va en `.gitleaksignore` con su motivo.
- **Pruebas que no se saltean.** La base de pruebas es obligatoria (`EXIGIR_BASE_PRUEBAS=1`) y la cobertura del dominio debe seguir en 100 %. Señalar un `continue-on-error`, un `|| true` o un umbral rebajado.
