# Frontend Design Master v1.1.0

Skill universal **escrita desde cero** en español para **Cursor + Claude Code** (y empaquetable para Claude.ai), dirigida a React/TypeScript, WinUI 3, Flutter y HTML/CSS.

## Qué contiene

- `SKILL.md`: punto de entrada y coordinador con selección de módulos.
- `references/`: guías operativas de UX, diseño visual, prototipos, motion, accesibilidad, calidad, tablas, tokens y coordinación de agentes.
- `platforms/`: implementación específica según tecnología.
- `templates/`: formatos para planes, especificaciones, reportes y aceptación.
- `scripts/`: instalador PowerShell con staging/respaldo/recuperación, validador Python, y verificador conservador de referencias de un HTML.
- `THIRD_PARTY.md`: fuentes, diferencias frente a las herramientas originales y licencias.

### Importante: alcance real

Para utilizar capacidades literales de los repositorios originales consulta `references/15-native-tools-optional.md`.

No es una copia ni un reemplazo binario de `web-artifacts-builder`, `ux-designer-skill`, `taste-skill` o `transitions.dev`. Integra **principios y workflows** originales para que sirvan offline con un solo coordinador. **No incluye** el tarball de shadcn/ui, los scripts de Anthropic, el motor de screenshot/arte de Taste, los CSS premium/CLI de Transitions ni instaladores externos. Si deseas esas capacidades literales, hay instrucciones y vínculos oficiales en `THIRD_PARTY.md` para instalarlas por separado.

## Instalación sin duplicar contenido

La misma carpeta sirve para ambas herramientas, pues Cursor también lee `.claude/skills/`.

### Opción A — Global para Cursor y Claude Code (Windows)

1. Extrae el ZIP, conservando la carpeta `frontend-design-master`.
2. Copia **esa carpeta completa** a:

   `C:\Users\TU_USUARIO\.claude\skills\frontend-design-master\`

3. Comprueba que existe `...\frontend-design-master\SKILL.md` (no otra carpeta intermedia).
4. Reinicia la sesión de Cursor y Claude Code para que refresquen sus Skills.

Desde PowerShell, dentro de la carpeta extraída `frontend-design-master`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Scope User
```

Si ya existe una versión, el script se detiene. Para actualizar de manera controlada:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Scope User -Force
```

El script respalda la versión anterior antes de reemplazarla. Primero crea una copia temporal y después actualiza; incluso puede ejecutarse desde la carpeta instalada. La opción `-WhatIf` permite revisar los cambios propuestos sin modificar la instalación.

### Opción B — Solo un proyecto (ambos agentes)

Ubica la carpeta en la raíz del repositorio:

```text
MI-PROYECTO/
  .claude/
    skills/
      frontend-design-master/
        SKILL.md
        references/
        platforms/
        ...
```

Con PowerShell dentro de la carpeta `frontend-design-master`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Scope Project -ProjectPath "D:\Proyectos\MiApp"
```

### Opción C — Claude.ai en navegador

Carga el **ZIP** en la administración de Skills personalizadas de Claude.ai si tu plan y la función están disponibles. Claude.ai no accede por sí mismo al disco local ni a la carpeta `.claude` de tu PC. Esta instalación es independiente de Claude Code y no se sincroniza automáticamente desde Git.

## Invocación

Puede activarse automáticamente por la descripción o de forma explícita (según interfaz):

```text
Usa frontend-design-master para rediseñar este formulario WinUI 3.
Respeta el código y el tema existente; mejora los estados de error.
No modifiques backend ni base de datos. Verifica los cambios.
```

```text
Usa frontend-design-master para crear un dashboard React.
Carga módulos UX, visual y tablas. No agregues animaciones decorativas.
```

```text
Usa frontend-design-master para auditar esta pantalla Flutter.
No edites archivos: entrega hallazgos por severidad y pruebas necesarias.
```

## Comprobar integridad

Con Python 3.9+ opcional:

```powershell
python .\scripts\validate_skill.py
python -m unittest discover -s tests -v
```

La prueba estática y los tests no evalúan si un LLM sigue las instrucciones. Para eso, ejecutar escenarios de `EVALS.md` en Cursor y Claude Code. El verificador HTML se usa así:

```powershell
python .\scripts\check_artifact.py .\bundle.html --strict
```

No necesita npm, claves API ni servicios remotos para **leer** la skill. Compilar y ejecutar pruebas sí depende del proyecto.

## Actualización / distribución

Mantén **una sola fuente en Git**; coloca `frontend-design-master/` en `.claude/skills/` del repositorio o distribúyela globalmente. No dupliques las referencias en carpetas separadas para Cursor y Claude. En agentes cloud, confirma el mecanismo de distribución correspondiente: una Skill global en tu PC no se comparte por sí sola.

## Notas de diseño

- Reglas generales: UX primero, arquitectura existente, plan antes de editar y auditoría de calidad.
- Maneja código administrativo de alta densidad sin imponer el estilo visual de landing pages.
- La inspección de captura/ejecución de browser requiere herramientas disponibles; si no existen, el agente debe declararlo explícitamente.
- Los ejemplos son guías, no plantillas obligatorias.

Versión 1.1.0 — 2026-10-23.

## Cambios relevantes v1.1.0

- Direcciones visuales calibradas (variación, motion, densidad) sin desviar el software administrativo a estética de landing page.
- Protocolo UX profundo, patrones de motion originales y criterios de aceptación por plataforma.
- Instalador con staging y rollback para actualizaciones desde la misma carpeta.
- Validador con controles de metadata y pruebas estáticas, casos de evaluación en Cursor/Claude Code.
- No confundir integración metodológica con ejecución de repositorios externos.
