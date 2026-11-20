---
name: documentar-prompt
description: Usar inmediatamente después de completar trabajo de código en este repo a partir de un prompt real del usuario, para agregarlo a prompts.md con el formato correcto antes de pedir confirmación de commit. No usar para decisiones que tomaste tú solo sin que el usuario las pidiera — esas no se documentan como "prompt".
---

# Documentar un prompt en prompts.md

Formato exacto (ver `prompts.md` para ejemplos reales ya escritos en este repo):

```
**Prompt N — <título corto que resuma la intención>:**

"<cita textual del mensaje del usuario, si fue una instrucción en texto>"

<1-3 frases: qué se generó o cambió a partir de ese prompt, con nombres de archivo concretos>

*Criterio humano:* <qué se revisó, decidió o verificó manualmente — la parte que exigió juicio, no la ejecución mecánica>
```

Reglas:

- Usa el número de Prompt siguiente al último que exista en el archivo — nunca reinicies la numeración ni la dupliques.
- Si el prompt vino de un hallazgo automático (security review, CI, un hook) y no de un mensaje del usuario, acláralo explícitamente en el texto documentado (ver el Prompt sobre el security review como ejemplo) — nunca lo presentes como si el usuario lo hubiera pedido.
- La plantilla del curso espera un máximo de ~3 prompts por sección temática (1-7 del índice de `readme.md`); si una sección de la Entrega 1 ya tiene 3, los prompts de implementación de código van en una sección nueva al final ("Entrega N — ..."), no mezclados ahí.
- *Criterio humano* es la parte que más se salta al documentar rápido — no la dejes vacía ni la rellenes con relleno genérico ("se revisó el código"); di concretamente qué se verificó (un comando, una prueba manual, un trade-off que se decidió a propósito).
