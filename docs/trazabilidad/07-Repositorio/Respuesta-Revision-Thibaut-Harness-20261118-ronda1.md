# Respuesta a la revisión adversarial del harness — ronda 1

- **Fecha:** miércoles 18/11/2026 (verificada con `date`).
- **Informe que se responde:** `Revision-Thibaut-Harness-20261118-ronda1.md` (15 hallazgos: 4 críticos, 9 altos, 2 medios).
- **Material revisado:** los ocho ficheros del harness en el clon, con las huellas que trae el informe.
- **Decide:** la Dirección. Aprobó la clasificación el 18/11, con las dos decisiones que se le plantearon (hallazgos 3 y 9).
- **Cómo se verificó cada cita:** los hallazgos 1 a 9 y 14 se reprodujeron ejecutando el hook original en repositorios desechables, con un caso de control (el secreto solo sí bloqueaba). Los hallazgos 10 a 13 y 15 se verificaron leyendo el fichero. Los 15 resultaron ciertos.
- **Respaldo del estado anterior:** `<carpeta-de-respaldos>/20261118-M2-harness-antes-correcciones-thibaut/` (9 ficheros, tomados antes de modificar).

## Resultado

| Respuesta | Cantidad | Hallazgos |
|---|---|---|
| Se corrige | 15 | 1 a 15 |
| Se acepta el riesgo | 0 | — (cuatro límites parciales, abajo) |
| Se descarta | 0 | — |
| **Total** | **15** | |

Pruebas después de corregir: `prueba-datos-que-no-salen.py` **156 de 156** (antes 35) y `prueba-instalar-guardarrailes.py` **44 de 44** (antes 25). El hook nuevo, corrido contra todo el contenido actual del repositorio con la lista privada real, no da ningún hallazgo (10 ficheros).

## Hallazgo por hallazgo

| # | Nivel | Hallazgo | Respuesta | Qué se hizo y dónde |
|---|---|---|---|---|
| 1 | Crítico | El mensaje del commit no se revisaba | Se corrige | Tercer modo del hook, `--commit-msg`, instalado como hook `commit-msg` de git. En modo Claude Code se revisa el mensaje venga por `-m`, `--message=`, `-F <fichero>` o heredoc, y el del commit anterior si es un `--amend` sin mensaje nuevo. Se revisa el mensaje entero, comentarios incluidos |
| 2 | Crítico | Una línea `++ ` apagaba la revisión del resto del bloque | Se corrige | `lineas_agregadas()` pide el diff de un solo fichero y distingue cabecera de contenido por estado, no por el prefijo `+++`. De paso: la salida de git se decodifica a mano, porque el modo texto partía en dos una línea con un retorno de carro suelto (otro bypass, no señalado) |
| 3 | Crítico | Los binarios no se inspeccionaban ni se rechazaban | Se corrige | Decisión de la Dirección: se detiene todo binario salvo imágenes (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`); de esas se revisan las cadenas legibles de 8 caracteres o más. Un fichero de texto con un byte nulo cuenta como binario y se detiene |
| 4 | Crítico | Las rutas no se revisaban y el registro las publicaba | Se corrige | La ruta pasa por la misma revisión que el contenido. Si el hallazgo está en la ruta, el registro escribe «(ruta no registrada)» en todas las filas de ese fichero |
| 5 | Alto | En modo Claude se podía preparar contenido después de la revisión | Se corrige | Se cambió la lógica de lista negra a regla positiva: `git commit` debe ser la primera orden del comando, escrito directo, sin `-a`/`-i`/`-o`/`-p`, sin rutas, sin variables de entorno delante, sin sustituciones ni envoltorios (`bash -c`, `env`, `if`). Se reconocen las opciones largas abreviadas (`--inc`). Lo que va después del commit es libre |
| 6 | Alto | Rutas citadas por git y cambios de tipo quedaban fuera | Se corrige | La lista de ficheros sale de `--numstat -z` (sin comillas ni escapes) y el filtro pasa de `ACMR` a «todo menos lo borrado», que incluye el cambio de tipo |
| 7 | Alto | Se permitían dominios reales | Se corrige | Dominios de ejemplo: solo `example.com`, `.org` y `.net`. Salen `anthropic.com`, `users.noreply.github.com` y `ejemplo.com` (que es un dominio registrable). Queda una única dirección exacta permitida: la del pie de coautoría de Claude Code. `CLAUDE.md` §2 alineado |
| 8 | Alto | `.env.example` podía llevar valores | Se corrige | Cada línea agregada debe ser vacía, comentario o `NOMBRE=` sin valor. `PUERTO=3000` ahora se detiene |
| 9 | Alto | Los términos «literales» no se buscaban literalmente | Se corrige | Decisión de la Dirección: con 6 caracteres o más el término se busca en cualquier parte; más corto, como palabra completa (con letras acentuadas contadas como letras). La cabecera ya dice lo que hace |
| 10 | Alto | La plantilla no garantizaba texto propio en todos los errores | Se corrige | Cada `CREATE` va dentro de un bloque con `EXCEPTION WHEN OTHERS`, que relanza con nuestro texto y lleva el motivo y el código del motor como dato. Cubre también la ejecución concurrente. Límite declarado: el error de sintaxis del propio fichero |
| 11 | Alto | La validación solo comprobaba existencia | Se corrige | El ejemplo de validación 1 a 1 lleva dos filas por objeto: que existe, y que está hecho como se pidió (columnas con tipo y nulabilidad, definición del índice, definición de la constraint). El esperado se copia de la spec |
| 12 | Alto | `DROP` y `CREATE` «sin riesgo» y sin transacción | Se corrige | Los dos van en un mismo bloque `DO`, que es una sola sentencia y se deshace entera. Se quitó «sin riesgo». Queda por confirmar si la herramienta envuelve la migración completa en una transacción |
| 13 | Alto | El instalador pisaba un hook con solo encontrar la marca | Se corrige | Tres casos: idéntico al esperado → se recrea; con la marca pero distinto → se guarda una copia fechada y se avisa; sin la marca → no se instala nada. Los dos hooks se comprueban antes de tocar ninguno |
| 14 | Medio | No todos los bloqueos dejaban registro | Se corrige | Todos los caminos de bloqueo pasan por `bloquear()`. La cabecera dice qué pasa si el registro no se puede escribir (se advierte y se detiene igual) |
| 15 | Medio | La suite no cubría cada regla con positivo y negativo | Se corrige | Las siete categorías de secreto, mensaje, binarios, rutas, cambio de tipo, `.env.example`, término pegado y corto, committer distinto, dominios retirados, 24 formas de commit que deben detenerse en modo Claude y los tres modos del hook |

## Límites que quedan, y qué los cubre mientras tanto

| Límite | Hallazgo | Qué lo cubre |
|---|---|---|
| El modo Claude Code no ve un commit hecho por un alias, un script o `make` | 5 | El `pre-commit` y el `commit-msg` de git, que sí corren. Por eso deben estar instalados |
| De una imagen solo se leen cadenas ASCII; texto comprimido o en otra codificación no se ve | 3 | La lista de extensiones es corta; no entran PDF, Excel ni ZIP |
| Un error de sintaxis en una migración sale con el texto del motor | 10 | Aparece al aplicar la migración en local, antes de la base compartida |
| `--no-verify` salta los hooks de git | — | Regla de `CLAUDE.md`; el hook no puede impedirlo |

Los tres primeros están escritos en la cabecera del hook y de la plantilla. **Pendiente de la Dirección:** dónde se anotan como características de versiones futuras; la tabla «Sale del MVP» del README es de producto, no de herramientas.

## Por confirmar

- Si la herramienta de migraciones de Supabase envuelve cada fichero en una transacción. La plantilla ya no depende de eso para un objeto, pero sí para la migración completa.
- **La plantilla SQL corregida no se ejecutó contra una base:** Docker no estaba corriendo en la máquina. Se prueba al escribir la primera migración (T-02).

## Cambios no pedidos por el informe, hechos al corregir

- Un fallo interno del hook en modo Claude Code terminaba con código 1, que no bloquea. Ahora cualquier excepción termina en «quedé ciego» y bloquea.
- `git commit -C`, `-c`, `--reuse-message` y `--reedit-message` se detienen en modo Claude Code: traen autor y mensaje de otro commit.
- Desaparece el falso bloqueo conocido: las palabras `--author` o `user.email` dentro del mensaje ya no detienen el commit, porque el comando se analiza por partes.
- La tabla de verificación del instalador ya sale alineada.
