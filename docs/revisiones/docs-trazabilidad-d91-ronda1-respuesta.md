# Respuesta a la ronda 1 — rama `docs/trazabilidad-d91`

> Jueves 19/11/2026. Responde a `docs-trazabilidad-d91-ronda1-corrida1.md` (10 hallazgos y 1 sospecha) y
> `docs-trazabilidad-d91-ronda1-corrida2.md` (12 hallazgos y 1 sospecha). Unidos quedan **16 hallazgos
> distintos y 2 sospechas**; 5 hallazgos salieron en las dos corridas.
> **Límite de la ronda:** el registro de decisiones no entró en el material, porque con él se pasaba del
> tope de entrada del revisor (422.296 caracteres frente a 400.000). Que cada decisión citada exista lo
> comprueba el verificador; lo que dice cada una, no lo vio el revisor.

## Resumen

| Cierre | Cuántos |
|---|---|
| Corregido (6, 7, 9 a 14) | 8 |
| Corregido en parte, con el resto declarado (1, 8) | 2 |
| Fuera del alcance de este cambio: se lleva a los tickets v5 o a la Dirección (2, 3, 5) | 3 |
| Descartado, con su razón (4, 15, 16) | 3 + 2 sospechas |
| **Total** | **16 + 2 sospechas** |

**Pendiente de la Dirección:** los números 1, 2 y 5.

## Hallazgo por hallazgo

| # | Hallazgo (corrida) | Cierre | Qué se hizo y por qué |
|---|---|---|---|
| 1 | El README publica el nombre completo del autor, y las reglas prohíben nombres de personas (c1-2, c2-1) | **Corregido en parte · pendiente de la Dirección** | La plantilla del curso pide el nombre en la ficha 0.1, y está publicado desde la entrega 1 (commit `a09e888`, 17/10/2026). Lo que estaba mal es que la regla no lo exceptuaba. Se escribió la excepción en el README (bloque de anonimización) y en `CLAUDE.md` §2. **La Dirección confirma la excepción o decide quitar el nombre**; si lo quita, el historial lo conserva igual |
| 2 | La integración continua no pasa el hook de datos sobre el contenido subido (c1-1) | **Declarado · pendiente de la Dirección** | Es real y anterior a este cambio: el hook corre en la máquina, y lo que llega por `merge` no pasa por él (ya estaba en `CLAUDE.md` §2). Cubrirlo pide un modo nuevo del hook que funcione sin la lista privada, que no puede estar en el ejecutor. Se declaró el límite en el README (§2.2). Propuesta: aceptarlo como riesgo para esta entrega y anotarlo como característica futura. Mientras tanto lo cubre que todo commit lo hace el agente con el hook, y que solo se une trabajo de ramas propias por pull request |
| 3 | La separación entre organizaciones en el correo no tiene una prueba asignada en el recorte (c1-3, c2-4) | **Fuera del alcance · tickets v5** | Es real en el plan: HU-07.4 no lista HU-03.CA-4 ni el escenario «dos organizaciones en la misma ejecución» de la especificación, y HU-07.8 está diferido. Este cambio es de documentación y no toca el plan. Se lleva a los tickets v5, y la revisión del tramo 9 lo exige: el escenario está en la especificación, y la regla «spec, después pruebas» pide probar cada escenario |
| 4 | El plazo de un intervalo puede figurar cumplido con una marca retroactiva (c1-4, c2-3) | **Descartado como defecto nuevo · README corregido** | Es un límite ya declarado y aprobado: RNF-3 lo dice («el plazo lo cumple el momento de la detección») y lo amplió la decisión 35 de D-86. El README lo omitía en §5: ahora lo dice. Que la métrica M-2 refleje ese límite se revisa en la próxima versión del PRD |
| 5 | La especificación no recupera lo pendiente del día anterior tras una caída, y RNF-4 y HU-07.CA-11 piden reportar lo pendiente (c1-5) | **Fuera del alcance · a la Dirección** | La especificación lee «lo pendiente de ese día» como el día en que el sistema vuelve. Si la caída cruza la medianoche, lo del día anterior no se reporta. Es una lectura posible, pero nadie la aprobó por separado. Se lleva a la Dirección antes del tramo 8 (HU-07.3): aceptarla como riesgo o corregir la especificación |
| 6 | H-4 no incluye comprobar qué dirección ve el servicio, que la especificación le encarga (c1-6) | **Corregido en el README · tickets v5** | Ya estaba entre los pendientes de los tickets v5. El README (§0.4) decía tres comprobaciones; ahora dice la cuarta y que el recorte aún no la lista |
| 7 | Cambiar a la vez una copia y su huella pasa en verde (c1-7, c2-8) | **Corregido** | Opción `--base` en el verificador: falla si una copia que ya estaba en la referencia cambió o desapareció. La integración continua la usa contra la rama base en los pull requests, y contra el commit anterior en los push. Tres casos de prueba nuevos, uno de ellos documenta que sin `--base` pasaría |
| 8 | El verificador no revisa «todo lo que se sube» (c1-8, c2-6) | **Corregido en parte** | Los documentos vivos suman el workflow, los scripts y el hook (de 8 a 12). Quedan fuera, a propósito y declarado: las pruebas, cuyos datos de juguete citan cosas inexistentes para probar que se detectan, y el código de la aplicación, que todavía no cita. Se corrigió el texto que prometía más: el verificador comprueba las citas que hay, no si falta alguna (`CLAUDE.md` §7, README §2.5, índice) |
| 9 | No verifica los criterios `HU-xx.CA-n` y faltan negativos por familia (c2-7, c1-9) | **Corregido** | Familias nuevas: criterios (`HU-xx.CA-n`), puntos `PA-B` y `PA-P`, métricas `M-n` y notas `N-n`, cada una con su fuente. Un negativo por cada una de las 14 familias. Las pruebas pasan de 14 a 32 casos |
| 10 | La columna de origen del índice no se valida (c2-9) | **Corregido** | Una copia idéntica o neutralizada debe venir del mismo paso y con el mismo nombre; una derivada, del mismo paso. Caso de prueba nuevo. Límite declarado: el origen vive en un espacio privado y no se puede abrir desde el repositorio |
| 11 | El índice llama «vigentes» a documentos que se declaran pendientes de revisión (c2-10) | **Corregido** | La columna pasa a «Última versión», y el índice dice qué manda mientras no estén los tickets v5 (especificación y PRD v8), con las dos diferencias conocidas: 72 frente a 24 horas (D-70) y PA-B10 resuelto |
| 12 | No verifica los enlaces Markdown (c2-11) | **Corregido** | Se revisa el destino de cada enlace que no es web. Caso de prueba nuevo |
| 13 | `prompts.md` da pg-boss como decisión vigente (c2-12) | **Corregido** | Se tachó y se cita D-27, que lo pasó a tubería el 16/11 |
| 14 | El README afirma Node 20 sin probarlo (c1-10) | **Corregido** | El README dice Node 22, la versión de la integración continua, y que la 20 no se ha probado |
| 15 | Un aviso que llega mientras corre la clasificación evita el reporte (c2-2) | **Descartado** | Es la regla aprobada con la especificación (D-89): la condición 3 se comprueba al tomar el candado, a propósito, para no reportar a quien ya avisó. Va con la decisión 30 de D-86 sobre el momento del aviso. El revisor la lee como defecto; la Dirección puede reabrirla |
| 16 | Se difiere la prueba de concurrencia aunque las reglas piden probar cada pieza (c2-5) | **Descartado** | El aplazamiento es parte del recorte decidido (D-73, recorte v4 §3, HU-07.5) y está declarado como riesgo en la especificación. No es una omisión silenciosa |
| S1 | La salida de la prueba de HU-01.6 podría publicar pases o tokens (c1, sospecha) | **Descartada** | Se revisó el archivo: trae nombres de campos y `session_id: True`, sin ningún valor. El hook lo pasó, y detiene los tokens con forma de JWT |
| S2 | No se puede confirmar que el revisor sea de otro proveedor (c2, sospecha) | **Descartada** | La cabecera de cada corrida de esta ronda lo dice: perfil `openai`, modelo `gpt-5.6-sol`. El código y los documentos los redacta Claude |

## Cruce de las correcciones contra las reglas que tocan

Cada corrección se cruzó antes de responder, como se hace desde la ronda 5 de la especificación.
- Las familias nuevas no dieron ningún falso rojo en los 12 documentos vivos. Los PA-P cerrados están definidos en el PRD v1, y por eso se agregó como fuente.
- `--base` se probó con una versión agregada (pasa), con una reescrita (falla) y con una referencia inexistente (queda ciego y falla). Lo único que agrega en el índice es la fila nueva, y la regla no lo prohíbe.
- La excepción del autor solo cubre la ficha 0.1. El resto de la regla de anonimización no cambia.
