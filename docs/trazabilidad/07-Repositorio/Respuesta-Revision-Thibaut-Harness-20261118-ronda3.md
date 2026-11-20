# Respuesta a la revisión adversarial del harness — ronda 3 (dos corridas unidas) y cierre

- **Fecha:** miércoles 18/11/2026 (verificada con `date`).
- **Informes que se responden:** `Revision-Thibaut-Harness-20261118-ronda3-corrida1.md` (9 hallazgos y una sospecha) y `…-corrida2.md` (10 hallazgos). Unidos: **15 hallazgos distintos** (19 en bruto; 4 repetidos entre corridas: C2-1 y C2-8 repiten C1-1, C2-5 repite C1-2, C2-9 repite C1-8).
- **Decide:** la Dirección. El 18/11 aprobó corregir los baratos y **cerrar la revisión sin cuarta ronda**.
- **Cómo se verificó:** 10 se reprodujeron en repositorios desechables; 5 se verificaron leyendo. 14 ciertos, 1 falso.
- **Corrección de conteo:** al presentar la clasificación a la Dirección se dijo «14 distintos, 13 ciertos»; contados uno a uno son 15 y 14. La diferencia es `--fixup`/`--squash` (C1-6), que se había sumado dentro de C2-1.

## Resultado

| Respuesta | Cantidad | Hallazgos (C1 = corrida 1, C2 = corrida 2) |
|---|---|---|
| Se corrige | 12 | C1-1 (con C2-1 y C2-8) · C1-2 (con C2-5) · C1-4 · C1-5 · C1-6 · C1-7 · C1-8 (con C2-9) · C1-9 · C2-4 · C2-6 · C2-7 · C2-10 |
| Se acepta el riesgo | 2 | C1-3 · C2-2 |
| Se descarta | 1 | C2-3 |
| **Total** | **15** | |

Pruebas después de corregir: `prueba-datos-que-no-salen.py` **231 de 231** (antes 198) y `prueba-instalar-guardarrailes.py` **52 de 52** (antes 44). El hook, corrido contra todo el contenido del repositorio con la lista privada real, no da ningún hallazgo.

## Hallazgo por hallazgo

| Hallazgo | Nivel | Qué pasaba | Respuesta | Qué se hizo |
|---|---|---|---|---|
| C1-1 · C2-1 · C2-8 | Crítico | `git -c core.hooksPath=/dev/null commit`, un alias definido con `-c` y `-F /dev/stdin` evadían al modo Claude y apagaban los hooks de git | Se corrige | Se detiene todo `-c` en la orden del commit, y `-c alias.*` o `core.hooksPath` en cualquier orden de git del comando. `-F /dev/stdin` se trata como `-F -` |
| C1-6 | Medio | `--fixup` y `--squash` reutilizaban un mensaje sin revisarlo | Se corrige | Se revisa el mensaje del commit al que apuntan |
| C2-2 | Crítico | `git merge` no ejecuta el `pre-commit`; tampoco `pull`, `cherry-pick` ni `rebase` | Se acepta el riesgo | Comprobado: un merge de una rama con un secreto entró. La red correcta es un hook `pre-push`, que es una pieza nueva: queda como versión futura, anotada en el README. Mientras tanto: un solo autor, ninguna rama ajena, y la regla de `CLAUDE.md` §2 de revisar a mano antes de traer trabajo |
| C2-3 | Crítico | «El instalador ignora `core.hooksPath`» | Se descarta | Falso. Probado: `git rev-parse --git-path hooks` respeta `core.hooksPath`; el instalador instaló ahí y el hook detuvo el commit. Queda como caso de prueba |
| C2-4 | Alto | Con `-C` a otro repositorio se usaban la lista y el registro de este | Se corrige | Un commit hacia otro repositorio se detiene. Solo se admite este repositorio o un árbol de trabajo suyo |
| C1-2 · C2-5 | Alto | Un binario cualquiera con extensión de imagen pasaba | Se corrige | Se comprueba la firma del formato |
| C2-6 | Alto | Un `.gitattributes` hacía pasar un PDF por texto | Se corrige | El binario se detecta leyendo el contenido, además de lo que diga git |
| C1-3 | Alto | Un secreto armado por partes en el código no se detecta | Se acepta el riesgo | Es el límite de buscar patrones. Declarado en la cabecera del hook y en el README |
| C1-4 | Alto | Secretos en JSON o entre comillas invertidas no se detectaban | Se corrige | El patrón admite comillas alrededor del nombre y comilla invertida en el valor |
| C1-5 | Alto | Si desaparecía uno solo de los dos hooks de git, quedaba media revisión | Se corrige | Cada hook exige que el otro esté instalado, sea ejecutable y lleve la marca; si no, «quedé ciego» |
| C2-7 | Alto | La plantilla podía borrar un índice del mismo nombre de otra tabla | Se corrige | Pre-check que aborta si el índice existe sobre otra tabla; el post-check comprueba la tabla |
| C1-7 | Medio | El correo del pie de coautoría se admitía en cualquier fichero | Se corrige | Solo se admite en el mensaje del commit |
| C1-8 · C2-9 | Medio | Un correo con letras no ASCII antes de la arroba no se detectaba | Se corrige | La parte local admite letras de cualquier alfabeto. La parte local entre comillas queda declarada como límite |
| C1-9 | Medio | El registro decía «una fila por commit» y escribe una por hallazgo | Se corrige | Encabezado y cabecera corregidos |
| C2-10 | Medio | Las entradas `re:` de la lista no tenían pruebas | Se corrige | Positivo, negativo y expresión inválida |
| Sospecha C1 | — | `-C/ruta` o `-cclave=valor` pegados | Se descarta | Probado: git no acepta esas formas (código 129) |

## Cierre de la revisión

Tres rondas: 15, 9 y 14 hallazgos. Lo nuevo de la tercera ya no son errores del hook, sino formas deliberadas de rodearlo. La cabecera del hook declara ahora contra qué protege —el descuido— y contra qué no —quien quiera saltárselo a propósito teniendo la terminal—. Con eso la Dirección cierra la revisión del harness. Estas últimas correcciones no pasan por una cuarta ronda: es una decisión tomada, no un olvido.

## Riesgos aceptados → versiones futuras

Dos filas más en la tabla «Sale del MVP y queda contemplado» del README (de 18 a 20): el hook `pre-push` y los secretos armados por partes.

## Sigue por confirmar

- Si la herramienta de migraciones de Supabase envuelve cada fichero en una transacción.
- La plantilla SQL no se ha ejecutado contra una base (Docker apagado). Se prueba en T-02.
