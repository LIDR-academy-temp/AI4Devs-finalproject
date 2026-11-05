# ADR-0007: Instancia de demostración separada para el evaluador

- **Estado:** aceptada
- **Fecha:** 2026-11-04

## Contexto

El curso exige incluir en `readme.md` credenciales de prueba para el evaluador y la URL del despliegue. El sistema es de un solo usuario (RNF-01) y contiene datos personales: currículum, ofertas, decisiones y candidaturas (RNF-05). Con las credenciales de la instancia real, el evaluador vería esos datos y podría gastar el presupuesto de IA. Hallazgo AC1 de `docs/architecture-review.md`.

## Decisión

- Dos despliegues de la misma imagen en Railway, cada uno con su propia base de datos PostgreSQL y sus propias variables de entorno:
  - **Personal:** datos reales, URL y credenciales privadas.
  - **Demostración:** URL pública y credenciales en `readme.md`, con datos sintéticos (currículum de ejemplo, preferencias, una empresa objetivo con job board público y unas 10 ofertas) cargados por un seed (`node ace db:seed --demo`).
- La instancia de demostración usa topes de gasto de IA bajos (ADR-0008) y nunca recibe datos reales.
- El código no distingue entre instancias; solo cambian la configuración y la semilla.

## Alternativas consideradas

| Alternativa | Motivo para descartarla |
| --- | --- |
| Segundo usuario de demostración en la misma instancia | Requiere aislar datos por usuario en todas las consultas (multiusuario, excluido del MVP) y comparte el presupuesto de IA. |
| Solo video o capturas, sin credenciales | El curso pide credenciales cuando hay despliegue; limita la evaluación. |
| Credenciales de la instancia personal | Expone datos personales y el presupuesto de IA. |

## Consecuencias

- Positivas: el evaluador prueba el flujo completo sin acceso a datos reales; el costo de la demostración queda acotado.
- Negativas: dos servicios y dos bases de datos que operar y pagar (AB1); la semilla de demostración debe mantenerse al día con el modelo de datos.
