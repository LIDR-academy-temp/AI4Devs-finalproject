# mockup-a-contexto

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Convierte un mockup (HTML normal o bundled, URL, imágenes o PDF) en **contexto implementable**:
- **Frontend** (modos delta / nuevo): documentos md, un mockup HTML interactivo con la estructura real
  de la app y PNG por pantalla e idioma.
- **Backend** (modo flujo, sin acceso al frontend): pantallas y navegación, acciones → operaciones,
  datos por pantalla, modelo de datos candidato, reglas y estados, para diseñar endpoints y tablas.

El resultado es el documento «Mockup / Diseño Visual» del gate de `/definir`.

El procedimiento completo vive en la skill **`mockup-a-contexto`**
(`.cursor/skills/mockup-a-contexto/SKILL.md`). Leerla entera antes de empezar y seguirla paso a paso;
este comando solo resume.

---

## Cuándo usar

- Llega un mockup o diseño nuevo para mobile (Flutter), frontend (React), web (Razor) o escritorio (WinUI).
- Llega una versión nueva de un mockup que ya existía (modo **delta**).
- Llega un markdown de contexto + el HTML al back, sin repo del frontend (modo **flujo**).
- Antes de `/definir` en cualquier ticket con UI, si el mockup todavía no está traducido.

## Cuándo NO usar

- No hay UI en el requerimiento → `/definir` directo.
- Ya existe la carpeta de contexto del mockup y solo cambió una decisión → editar esos documentos (paso 8 de la skill).

---

## Reglas

- **No modificar código** (frontend ni backend). Solo leer. Se escribe únicamente en la carpeta de salida.
- El **código manda** sobre el estado actual; la **lista de negocio** sobre el alcance; el **mockup** sobre lo visual dentro del alcance.
- Si el mockup es una URL: pedir permiso antes de descargarlo.
- Toda afirmación sobre el código cita `archivo:línea`.
- **Contenido configurable:** textos de negocio, estatus, errores, umbrales, tonos y flags salen del back (iOS tarda hasta 5 días en publicar). En el ARB solo el marco de UI. Ver `references/contenido-configurable.md`.
- Sin lista de cambios de negocio (modo nuevo): derivarla del código y **confirmarla con el usuario** antes de escribir los documentos.

---

## Flujo

1. **Gate:** mockup nuevo + ruta del repo frontend (de `vars.RUTA_REPO_MOBILE` / `RUTA_REPO_FRONT` / `RUTA_REPO_WEB_LEGACY` / `RUTA_REPO_ASPNET_CORE`). Opcionales: mockup anterior (→ delta), lista de negocio, reglas ya decididas, doc de APIs.
   **Modo flujo:** mockup(s) + markdown de contexto (obligatorios); repo del back (`vars.RUTA_REPO_API`) y MCP (`vars.MCP_TEST`) recomendados. Seguir `references/flujo-backend.md` en lugar de los pasos 3–7.
   Si hay un mockup por canal (app + web): **un solo** `Contexto Backend` con `00 - Matriz de canales`; comparar con
   `scripts/mockup_inventory.py --channel app=<app> --channel web=<web> [--channel erp:admin=<WinUI/ERP>] --flow`. Las diferencias de regla entre canales siempre van a decisión.
   El WinUI / ERP (administración) se cruza contra entidades y estados, no pantalla contra pantalla; revisar siempre quién consulta, corrige, cambia estado, configura y audita lo que crean la app y la web.
2. **Preparar:** `python .cursor/skills/mockup-a-contexto/scripts/unpack_bundle.py <mockup.html> <tmp>` si es bundle; recorrer todas las pantallas.
3. **Leer el frontend** con el profile del target y `references/lectura-frontend.md`; correr
   `scripts/mockup_inventory.py <mockup> [--compare <anterior>] --tokens <tema> --i18n <idiomas>`.
4. **Lista de cambios** + reglas de oro + lo que no entra → confirmar con el usuario.
5. **Documentos** (`references/documentos.md`): README, 01 pantallas, 02 textos, 03 estilos, 04 datos, 05 checklist, 06 decisiones.
6. **Mockup HTML** desde `assets/mockup-base.html` (`references/mockup-html.md`) → `scripts/build_mockup.py`.
7. **PNG:** `scripts/render_screens.py "<Mockup>.html" --out png` y revisar cada imagen.
8. **Entregar** y hacer el handoff.

---

## Salida esperada

```
<salida>/Contexto Backend <nombre>/                   README.md · 00 (2+ canales) · 01…07 · png/   (modo flujo)
<salida>/Contexto Implementación <nombre> — <Canal>/  README.md · 01…06          (delta / nuevo, uno por canal)
<salida>/Mockups <nombre> — <Canal>/                   Mockup <nombre>.html · README.md · png/
```

Carpeta de salida: la que indique el usuario → `<RUTA_MOCKUPS>/<TKT>/` si existe la var → `<RUTA_SPECS>/<TKT>/mockup/` → junto al mockup fuente. Back y front del mismo ticket comparten la carpeta: primero flujo (back), después delta/nuevo (front) usando el `TKT-*-APIS.md` del back.

**Handoff:** `Siguiente paso: /definir con <salida> como Mockup / Diseño Visual.`
