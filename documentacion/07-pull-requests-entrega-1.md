> Documento de diseño detallado (origen: README de la Entrega 1). Resumen y punto de entrada: [README](../README.md).

# 7. Pull Requests (Entrega 1)

> **Entrega 1 (lo que evalúa el máster):** **una sola PR** (o la rama de entrega) con **documentación del diseño** — no PRs de código. Repo privado (§0.5); el TA recibe acceso de lectura y la URL en el formulario.

**Prompt 1:** *(Claude · cierre Entrega 1 — qué va en la PR pública de documentación)*

```
Redacta la sección §7 Pull Requests para Entrega 1 AI4Devs: una única PR que integra readme.md,
prompts.md, SQL de diseño y contexto SDD (rama feature/entrega-1-AFS). Alcance: §0–§6, 0% código
obligatorio. Incluye checklist de revisión (coherencia readme ↔ SQL ↔ tickets) y enlace gh pr
cuando exista. No listes varias PRs futuras como si fueran entregables de esta entrega.
```

*Una PR de documentación evita confundir al evaluador con placeholders de código que aún no existe.*

> **Respuesta del asistente (§7):** PR única Entrega 1 = diseño completo (readme + prompts + SQL/contexto); rama `feature/entrega-1-AFS`; sin split en 3 PRs para esta entrega. — `prompts.md` [§7](../prompts.md#p7-prs)

**Pull Request — Entrega 1 (documentación):** *(integración del diseño SDD — enlace `gh pr` cuando se abra contra la rama base del curso)*

| Incluye | Excluye (Entrega 2+) |
|---------|----------------------|
| `readme.md`, `prompts.md`, `CLAUDE.md`, `SQL/` (esquema), `ContextoCuartaQuinientos/` | API/Web/Bot implementados, tests de producto, despliegue productivo |

**Checklist antes de merge (Entrega 1):** coherencia §3 ↔ `cuartaquinientos_schema.sql`; §4 ↔ tickets §6; poke-holes §5.0.1 reflejados; `prompts.md` alineado con extractos de este readme.

> **Nota (solo planificación interna — Entrega 2+):** cuando haya código, el equipo *puede* trocear en PRs pequeñas (backend → web → e2e) para revisión; eso **no** forma parte del entregable §7 de Entrega 1. Detalle opcional en `prompts.md` §7 Prompt 2.

**Prompt 2:** *(Entrega 2+ · metodología interna, no entregable Entrega 1)*

```
Si en Entrega 2 implementamos código: ¿cómo fragmentar PRs para revisión en equipo sin mezclar capas?
Respuesta en una nota breve (no sustituir la PR única de documentación de Entrega 1).
```

*Quedó la nota al pie de esta sección; no sustituye la PR única de Entrega 1.*

> **Respuesta del asistente (P2):** Troceo opcional backend → web → e2e (+ bot después); solo plan interno. — `prompts.md` [§7 Prompt 2](../prompts.md#p7-prs)

**Prompt 3:** *(Entrega 2+ · calidad en PRs de código)*

```
En cada PR de código (Entrega 2+): test plan en la descripción (`dotnet test`, smoke §4) +
revisión IA diff ↔ §4/§6 (prompts.md Flujo 5). No aplica a la PR única de documentación Entrega 1.
```

> **Respuesta del asistente (P3):** — (Entrega 2+; no ejecutado en Entrega 1). — `prompts.md` [§7 Prompt 3](../prompts.md#p7-prs)
