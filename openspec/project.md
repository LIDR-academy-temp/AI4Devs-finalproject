# Recon Tool 2.0 — contexto para OpenSpec

Ver `CLAUDE.md` para el vocabulario fijo, el stack y la forma de trabajar, y `README.md` como
fuente de verdad del producto. Las specs de `openspec/specs/` son extractos verificables del
README, no una segunda fuente: si una spec y el README discrepan, se corrige la spec en el
mismo change.

Capacidades: `accounts`, `fees`, `matching`, `import`, `validation`, `settlement`.
Convención de changes: `<modulo>-<tema>` en kebab-case; un change por feature; proposal
aprobado por K antes de `apply`.
