# Plantilla — Revisión adversarial de la arquitectura (G2)

Usar después de `docs/architecture.md` y los ADRs, antes de las historias detalladas. Guardar el resultado en `docs/architecture-review.md` con una columna "Resolución" por hallazgo.

```markdown
Cambia de sombrero: sé un arquitecto revisor adversarial. Critica docs/architecture.md y docs/adr/ contra docs/prd.md:

1. ¿Qué ADR depende de una suposición no verificada (versión, API externa, cuota, términos de uso)? ¿Qué spike la verificaría?
2. ¿Qué requisito no funcional no queda cubierto o no se puede probar en CI?
3. ¿Qué parte cuesta más de lo presupuestado en horas o en dinero (por ejemplo, llamadas a la IA)?
4. ¿Qué riesgo de seguridad o privacidad no tiene medida?
5. ¿Cada épica tiene módulos claros? ¿Hay módulos sin épica?
6. ¿Algún ADR aceptado contradice al PRD vigente?

Prioriza por nivel de riesgo y propone una corrección o un ADR nuevo para cada hallazgo.
```
