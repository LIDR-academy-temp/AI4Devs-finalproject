## Qué cambia

<!-- Una frase. Enlace al change de OpenSpec: openspec/changes/<nombre> -->

Change de OpenSpec: `openspec/changes/…` · Issue: #…

## Secciones del README que implementa

- §…

## Cómo se probó

- [ ] Tests de dominio (Vitest) con `data/samples/*/expected.json` como oráculo
- [ ] `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] Probado a mano con el archivo de muestra: …

## Revisión (cinco focos, README §7)

- [ ] Fidelidad al README y vocabulario fijo
- [ ] Dinero y fechas (`DECIMAL`, strings decimales, NULL como ±∞)
- [ ] Pruebas reales, no test theater
- [ ] Seguridad y datos sintéticos (sin secretos ni IDs reales)
- [ ] Arquitectura hexagonal (dominio sin Prisma/Fastify)

## Notas para el revisor

<!-- Decisiones tomadas, dudas, lo que no entra en este PR -->
