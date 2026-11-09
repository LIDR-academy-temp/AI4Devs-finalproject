# Fase 1 - Ejecucion smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-10-19 14:21:54 |
| Equipo | ARIELPC |
| Repo | D:\LIDR\ProyectoFinal\feature-entrega-1-AFS |

## Precondicion BD
- CuartaQuinientos en localhost: **OK**

## API - dotnet test (Category=Smoke; requiere API HTTP)
- Exit code: **0**
- Log: [dotnet-smoke.log](dotnet-smoke.log)

## Web - npm test (Vitest)
- Exit code: **0**
- Log: [npm-test.log](npm-test.log)

## API HTTP opcional (http://localhost:5180)
- GET /health -> 200

## Veredicto
**PASS**

Matriz: [matriz.md](matriz.md) | REST: [FASE1_SmokeApi.http](FASE1_SmokeApi.http)
