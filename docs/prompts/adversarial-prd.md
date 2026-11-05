# Plantilla — Revisión adversarial del PRD (G1)

Usar justo después de redactar o cambiar significativamente `docs/prd.md`, antes de la arquitectura. Guardar el resultado en `docs/prd-review.md` con una columna "Resolución" por hallazgo.

```markdown
Cambia de sombrero: sé un revisor de producto adversarial. Critica docs/prd.md (y docs/vision.md como contexto):

1. ¿Qué requisitos son ambiguos o no se pueden probar? Propón una redacción comprobable.
2. ¿Qué suposición, si resulta falsa, tumba todo el MVP?
3. ¿Dónde hay alcance escondido (algo que parece pequeño pero cuesta horas)?
4. ¿Qué métrica no se puede medir bien en la vida real? Para cada métrica, ¿qué evento o campo la registra?
5. ¿Las épicas cubren todos los requisitos y cada una mapea a una capability?
6. ¿El MVP cabe en las restricciones de tiempo y presupuesto documentadas?

Prioriza todo por nivel de riesgo (crítico, alto, medio, bajo) y propone una corrección para cada hallazgo.
```
