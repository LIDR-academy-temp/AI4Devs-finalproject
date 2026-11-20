# Respuesta a la revisión adversarial del harness — ronda 2

- **Fecha:** miércoles 18/11/2026 (verificada con `date`).
- **Informe que se responde:** `Revision-Thibaut-Harness-20261118-ronda2.md` (9 hallazgos: 2 críticos, 4 altos, 3 medios; y una sospecha).
- **Material revisado:** el harness ya corregido tras la ronda 1, con las huellas que trae el informe.
- **Decide:** la Dirección. Aprobó la clasificación el 18/11.
- **Cómo se verificó cada cita:** los hallazgos 1 a 7 se reprodujeron ejecutando el hook en repositorios desechables, con un caso de control (un correo real en `-m` sí bloqueaba). Los 8 y 9 se verificaron leyendo. Los 9 resultaron ciertos.

## Resultado

| Respuesta | Cantidad | Hallazgos |
|---|---|---|
| Se corrige | 8 | 1, 2, 3, 4, 5, 7, 8, 9 |
| Se acepta el riesgo | 1 | 6 |
| Se descarta | 0 | — (la sospecha, abajo) |
| **Total** | **9** | |

Pruebas después de corregir: `prueba-datos-que-no-salen.py` **198 de 198** (antes 156) y `prueba-instalar-guardarrailes.py` **44 de 44**. El hook, corrido contra todo el contenido actual del repositorio con la lista privada real y el nombre de autor real, no da ningún hallazgo (10 ficheros).

## Hallazgo por hallazgo

| # | Nivel | Hallazgo | Respuesta | Qué se hizo y dónde |
|---|---|---|---|---|
| 1 | Crítico | El modo Claude dejaba pasar `--no-verify`, y no leía `--trailer` | Se corrige | `--no-verify`, sus abreviaturas y `-n` se detienen. El valor de `--trailer` se revisa como mensaje. `-t` y `--template` se detienen: el mensaje vendría de una plantilla que no se ve. En la ronda 1 se vio que `--no-verify` pasaba y no se bloqueó por no agregar un control no pedido: fue un error de criterio, porque el `commit-msg` nuevo lo convirtió en la puerta para saltarlo |
| 2 | Crítico | Con `-C` el hook revisaba su propio repositorio y no el que recibía el commit | Se corrige | En modo Claude se revisa el repositorio destino: el directorio donde corre el comando más sus `-C`. `--git-dir`, `--work-tree` y `--namespace` se detienen. Si el destino no es un repositorio, «quedé ciego» |
| 3 | Alto | Variables y comodines se expandían después del análisis | Se corrige | La orden del commit se detiene si trae `$VAR`, `${VAR}`, `$'…'`, un comodín o llaves sin comillas, o un heredoc sin comillas en el delimitador con `$`. Entre comillas simples todo es literal y pasa |
| 4 | Alto | El nombre del autor no se revisaba | Se corrige | El nombre del autor, el de quien hace el commit y el del commit que se enmienda pasan por la lista privada. Comprobado: el nombre configurado en el clon no coincide con la lista |
| 5 | Alto | La clave temporal de AWS (`ASIA…`) pasaba | Se corrige | El patrón admite los dos prefijos |
| 6 | Alto | Un correo con dominio sin punto pasaba | Se acepta el riesgo | Buscarlo detendría texto legítimo (`usuario@localhost`). El nombre de una empresa lo cubre la lista privada. Declarado en la cabecera del hook y en el README, tabla «Sale del MVP» |
| 7 | Medio | `.ENV` en mayúsculas pasaba | Se corrige | El hook compara sin distinguir mayúsculas; `.gitignore` también |
| 8 | Medio | La validación traía una sola fila para la constraint | Se corrige | Seis filas: existencia y definición para tabla, índice y constraint |
| 9 | Medio | Las pruebas usaban `--no-verify`, prohibido sin excepción | Se corrige | La regla de `CLAUDE.md` §2 declara la excepción: solo dentro de los repositorios desechables de `tests/harness/`, para fabricar el estado previo |

## Sospecha

| Sospecha | Respuesta |
|---|---|
| El término privado y la ruta salen por pantalla y llegan al agente | Se descarta. El agente ya tuvo ese texto delante: fue quien lo preparó para el commit. La pista hace falta para saber qué corregir. Lo que no debe salir es el registro, que es público, y ese no la guarda |

## Hallazgos propios, encontrados al verificar

| Qué pasaba | Respuesta |
|---|---|
| `react@18.2.0` se detenía como correo de dominio real; un `package.json` con `packageManager` no habría entrado | Se corrige: el dominio de un correo debe terminar en letras |
| Una URL ssh de GitHub se detiene como correo | Se deja: en el repositorio se usa la URL `https` |
| La cabecera del propio hook traía un correo de ejemplo con dominio real; el hook se detuvo a sí mismo al probarlo contra todo el repositorio | Se corrige: usa `example.com` |

## Riesgos aceptados → versiones futuras

Por decisión de la Dirección (18/11), los límites aceptados de las dos rondas quedan anotados en el README, tabla «Sale del MVP y queda contemplado», para que conste que se dejaron a propósito: cuatro filas nuevas (de 14 a 18).

## Sigue por confirmar

- Si la herramienta de migraciones de Supabase envuelve cada fichero en una transacción.
- La plantilla SQL corregida no se ha ejecutado contra una base (Docker apagado). Se prueba al escribir la primera migración (T-02).
