# Trazabilidad — de la idea a la especificación

> Subido el jueves 19/11/2026 por decisión D-91: **todo lo que está en este repositorio cita su
> origen, y esa cita tiene que existir aquí.** Antes de esta fecha, el README y `prompts.md`
> citaban decisiones y tickets que solo vivían fuera del repositorio.

## Qué hay aquí

Una carpeta por paso del método, con el mismo nombre que tiene en el espacio de trabajo del
proyecto. Así las citas que los documentos se hacen entre sí (`../05-Tickets/…`) resuelven tal
como fueron escritas.

| Paso | Carpeta | Última versión | Qué produce |
|---|---|---|---|
| 1 · Discovery | `01-Discovery/` | `01-Discovery/discovery-controlador-tiempo.md` | Las preguntas del método, el registro de decisiones (D-1 a D-105) y los puntos abiertos (PA-1 a PA-9) |
| 2 · Alcance | `02-Alcance/` | `02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v2.html` | La primera propuesta de MVP (septiembre de 2026) |
| 3 · PRD | `03-PRD/` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md` | El documento de producto: requisitos (RF, RNF), restricciones (R) y riesgos aceptados (RA) |
| 4 · Backlog | `04-Backlog/` | `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` | Historias con criterios de aceptación |
| 5 · Tickets | `05-Tickets/` | `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md` y `05-Tickets/Recorte-Entrega-20261119-v4.md` | El plan completo (30 tickets) y el recorte para la entrega (23 tickets en 11 tramos) |
| 6 · Especificación | `06-Spec-viva/` | La especificación vive en `openspec/specs/`; aquí están sus siete rondas de revisión y la prueba de HU-01.6 | Las rondas que la refutaron antes de aprobarla (D-89) |
| 7 · Repositorio | `07-Repositorio/` | El harness vive en `.claude/`, `scripts/` y `tests/`; aquí están sus revisiones | Las rondas que refutaron el harness y el README v2 |

**Qué manda cuando no coinciden.** El backlog v5 y los tickets v4 son anteriores a la especificación aprobada (D-89) y dicen que se revisan después de ella. Esa revisión son los tickets v5, que se escriben con el PRD v9 antes del tramo 8 (miércoles 02/12/2026, D-99). Mientras tanto, **mandan la especificación y el PRD v8, y sobre ellos las decisiones posteriores al PRD v8** (D-90 en adelante): D-92 y D-98 sobre RNF-8 (el nombre del autor) y D-94 y D-96 sobre RNF-4 (lo del día anterior tras una caída). Dos diferencias conocidas: el enlace de contraseña dura 24 horas y no 72 (D-70), y el punto PA-B10 quedó resuelto con la prueba de HU-01.6 (D-69 a D-72, D-76 y D-77).

**Por qué están todas las versiones y no solo la última.** Cada revisión se hizo sobre una
versión concreta y la cita por su número. Sin esa versión, la revisión no se puede comprobar.

**Las revisiones.** Los archivos `Revision-Thibaut-*` son las revisiones adversariales: las hace un
modelo de IA distinto al que redactó el documento, con la instrucción de buscar dónde se rompe.
«Thibaut» es el nombre del perfil de ese revisor. Los `Respuesta-Revision-Thibaut-*` dicen cómo
se cerró cada hallazgo: se corrige, se acepta como riesgo o se descarta, con su razón.

## Cómo se comprueba

`python3 scripts/verificar-referencias.py`, que corre también en la integración continua, falla
si:
- un archivo de esta carpeta no está en la tabla de abajo, está dos veces, o la tabla cita uno que
  no existe;
- un archivo de esta carpeta es un enlace simbólico;
- la huella de un archivo no coincide con la de la tabla;
- una fila que empieza por un archivo no tiene la forma de la tabla (se lee, no se salta);
- el estado no es exactamente `idéntica`, `neutralizada` ni `derivada sin nombres`, o el origen no es coherente: una copia
  idéntica o neutralizada tiene que venir del mismo paso y con el mismo nombre, y una derivada, del
  mismo paso. El origen en sí vive en un espacio de trabajo privado y no se puede comprobar desde
  aquí;
- en la integración continua, que lo corre siempre con `--base` contra lo ya unido (la rama base en
  un pull request, el punto de salida en una rama de tramo, el estado anterior en la rama de la
  entrega; si no sabe contra qué, falla): una copia que ya estaba ahí cambió, cambió de tipo o
  desapareció. Las versiones nuevas se agregan, no se reescriben. Sin
  `--base`, cambiar a la vez un archivo y su huella pasaría. Se exceptúa lo que el índice de la
  base declara `derivada sin nombres` (el registro de decisiones), que se pone al día con cada
  decisión; aun así, cada decisión que ya estaba sigue igual, o igual con una nota al final o
  tachada: las decisiones crecen y se marcan, no se reescriben. Se lee el índice de la base para que
  una copia no se libre cambiando su estado. La comparación es con la
  base, no commit por commit: por eso los pull requests se unen con *squash* (D-97);
- un documento vivo (los que lista `scripts/referencias.txt`) cita una ruta, un enlace (en línea,
  entre ángulos o por referencia), una decisión, un requisito, un criterio o un ticket que no
  existe. En «HU-03.CA-1 a CA-3» o «D-1 a D-9» se comprueba cada número del intervalo.

**Huella:** los 12 primeros caracteres del SHA-256 del archivo tal como está en el repositorio.

## Qué cambió frente al original

De los 77 archivos, 48 son copia exacta de su origen, 28 están neutralizados y 1 es derivado. La
columna «Estado» de la tabla dice cuál es cuál.

- **`01-Discovery/discovery-controlador-tiempo.md`:** se derivó sin nombres de un documento de
  trabajo privado. Se sustituyeron empresas, personas, nombres de contratos y rutas internas; las
  decisiones no cambian de contenido. Su cabecera lo explica.
- **Cuatro revisiones del harness** (`07-Repositorio/Revision-Thibaut-Harness-*`): son revisiones del
  hook que impide subir secretos, y traían ejemplos de ataque inventados (claves falsas, correos de
  muestra). El propio hook los detuvo al subirlos, como debía. En la copia se cambió cada uno por
  su forma, sin el valor, por ejemplo `sk-<30 caracteres>` o `persona@<dominio-real>`. Fueron 10
  cadenas: 3 en la ronda 1, 2 en la ronda 2, 4 en la corrida 1 de la ronda 3 y 1 en la corrida 2. Los
  10 bloqueos quedaron anotados en `docs/seguridad/registro-de-bloqueos.md`.
- **Rutas locales (D-95):** las revisiones registran en su cabecera la ruta de cada archivo revisado.
  En 27 copias, entre ellas las cuatro anteriores, la ruta de la máquina se cambió por
  `<espacio-de-trabajo>` (la carpeta del proyecto) o `<repositorio>` (el clon). El resto del texto no
  cambia, y la huella de la cabecera es la del archivo revisado entonces. Una copia más, la respuesta
  a la ronda 1 del harness, traía en el cuerpo la ruta de la carpeta de respaldos: se cambió por
  `<carpeta-de-respaldos>`.

**Lo que no se sube:** el mapa del terreno (paso 0, copias de modelos reales de las empresas) y el
seguimiento diario de trabajo. El avance del día se ve en los commits y en los pull requests.

## Índice

| Archivo en el repositorio | Origen en el espacio de trabajo | Huella | Estado |
|---|---|---|---|
| `01-Discovery/discovery-controlador-tiempo.md` | `01-Discovery/discovery-controlador-tiempo.md (fuente privada)` | `3a7ffabf7bf9` | derivada sin nombres |
| `02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v1.html` | `02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v1.html` | `498bb231d176` | idéntica |
| `02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v2.html` | `02-Alcance/Propuesta MVP Controlador de Tiempo-20260910-v2.html` | `a44ff4d5acbc` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261116-v1.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261116-v1.md` | `587c5e0e4ceb` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261116-v2.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261116-v2.md` | `0b9a553f0520` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261117-v3.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261117-v3.md` | `7be0c259bb6c` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v4.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v4.md` | `0af65026d2ed` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v5.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v5.md` | `633789f424be` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v6.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261118-v6.md` | `3b95fb646b00` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v7.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v7.md` | `7cae73d345ef` | idéntica |
| `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md` | `03-PRD/PRD-MVP-Controlador-de-Tiempo-20261119-v8.md` | `660bdceba523` | idéntica |
| `03-PRD/Respuesta-Revision-Thibaut-PRD-v1-20261116-ronda1.md` | `03-PRD/Respuesta-Revision-Thibaut-PRD-v1-20261116-ronda1.md` | `a002f7b26938` | idéntica |
| `03-PRD/Respuesta-Revision-Thibaut-PRD-v2-20261117-ronda2.md` | `03-PRD/Respuesta-Revision-Thibaut-PRD-v2-20261117-ronda2.md` | `e78b52c0ec35` | idéntica |
| `03-PRD/Revision-Thibaut-PRD-v1-20261116-ronda1.md` | `03-PRD/Revision-Thibaut-PRD-v1-20261116-ronda1.md` | `d818904c7e6f` | **neutralizada** |
| `03-PRD/Revision-Thibaut-PRD-v2-20261116-ronda2-corrida1.md` | `03-PRD/Revision-Thibaut-PRD-v2-20261116-ronda2-corrida1.md` | `c9f3faee7931` | **neutralizada** |
| `03-PRD/Revision-Thibaut-PRD-v2-20261116-ronda2-corrida2.md` | `03-PRD/Revision-Thibaut-PRD-v2-20261116-ronda2-corrida2.md` | `26db2fa43985` | **neutralizada** |
| `03-PRD/verificar-prd.py` | `03-PRD/verificar-prd.py` | `0f1536ac8464` | idéntica |
| `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v1.md` | `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v1.md` | `4a2f5fe0b984` | idéntica |
| `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v2.md` | `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v2.md` | `117de4f1990c` | idéntica |
| `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v3.md` | `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v3.md` | `b13bc244079b` | idéntica |
| `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v4.md` | `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v4.md` | `c8e6a6c27d91` | idéntica |
| `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` | `04-Backlog/Backlog-MVP-Controlador-de-Tiempo-20261118-v5.md` | `84e92c472ace` | idéntica |
| `04-Backlog/Respuesta-Revision-Thibaut-Backlog-v1-20261118-ronda1.md` | `04-Backlog/Respuesta-Revision-Thibaut-Backlog-v1-20261118-ronda1.md` | `929a8ac8f52b` | idéntica |
| `04-Backlog/Respuesta-Revision-Thibaut-Backlog-v2-20261118-ronda2.md` | `04-Backlog/Respuesta-Revision-Thibaut-Backlog-v2-20261118-ronda2.md` | `1f35e7fc579a` | idéntica |
| `04-Backlog/Respuesta-Revision-Thibaut-Backlog-v4-20261118-ronda3.md` | `04-Backlog/Respuesta-Revision-Thibaut-Backlog-v4-20261118-ronda3.md` | `4e151d605195` | idéntica |
| `04-Backlog/Revision-Thibaut-Backlog-v1-20261118-ronda1.md` | `04-Backlog/Revision-Thibaut-Backlog-v1-20261118-ronda1.md` | `f07a199ca1b1` | **neutralizada** |
| `04-Backlog/Revision-Thibaut-Backlog-v2-20261118-ronda2.md` | `04-Backlog/Revision-Thibaut-Backlog-v2-20261118-ronda2.md` | `f23684622562` | **neutralizada** |
| `04-Backlog/Revision-Thibaut-Backlog-v4-20261118-ronda3.md` | `04-Backlog/Revision-Thibaut-Backlog-v4-20261118-ronda3.md` | `6d8dcf43ca19` | **neutralizada** |
| `04-Backlog/verificar-backlog.py` | `04-Backlog/verificar-backlog.py` | `07d3a548f0fc` | idéntica |
| `05-Tickets/Recorte-Entrega-20261118-v1.md` | `05-Tickets/Recorte-Entrega-20261118-v1.md` | `175121784f88` | idéntica |
| `05-Tickets/Recorte-Entrega-20261118-v2.md` | `05-Tickets/Recorte-Entrega-20261118-v2.md` | `9bdfad9a5e99` | idéntica |
| `05-Tickets/Recorte-Entrega-20261118-v3.md` | `05-Tickets/Recorte-Entrega-20261118-v3.md` | `1a21d65ea034` | idéntica |
| `05-Tickets/Recorte-Entrega-20261119-v4.md` | `05-Tickets/Recorte-Entrega-20261119-v4.md` | `c6d68d085af4` | idéntica |
| `05-Tickets/Respuesta-Revision-Thibaut-Tickets-v1-20261118-ronda1.md` | `05-Tickets/Respuesta-Revision-Thibaut-Tickets-v1-20261118-ronda1.md` | `3632bc921fd2` | idéntica |
| `05-Tickets/Respuesta-Revision-Thibaut-Tickets-v2-20261118-ronda2.md` | `05-Tickets/Respuesta-Revision-Thibaut-Tickets-v2-20261118-ronda2.md` | `06f28c558c04` | idéntica |
| `05-Tickets/Respuesta-Revision-Thibaut-Tickets-v3-20261118-ronda3.md` | `05-Tickets/Respuesta-Revision-Thibaut-Tickets-v3-20261118-ronda3.md` | `ab9576f7ef06` | idéntica |
| `05-Tickets/Revision-Thibaut-Tickets-v1-20261118-ronda1.md` | `05-Tickets/Revision-Thibaut-Tickets-v1-20261118-ronda1.md` | `9a66cf78d6cb` | **neutralizada** |
| `05-Tickets/Revision-Thibaut-Tickets-v2-20261118-ronda2.md` | `05-Tickets/Revision-Thibaut-Tickets-v2-20261118-ronda2.md` | `933b8c5d1b54` | **neutralizada** |
| `05-Tickets/Revision-Thibaut-Tickets-v3-20261118-ronda3-corrida1.md` | `05-Tickets/Revision-Thibaut-Tickets-v3-20261118-ronda3-corrida1.md` | `78e095fc3116` | **neutralizada** |
| `05-Tickets/Revision-Thibaut-Tickets-v3-20261118-ronda3-corrida2.md` | `05-Tickets/Revision-Thibaut-Tickets-v3-20261118-ronda3-corrida2.md` | `e5289b4db93d` | **neutralizada** |
| `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md` | `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v1.md` | `eb3c2b5aea01` | idéntica |
| `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v2.md` | `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v2.md` | `c3ea741ccee7` | idéntica |
| `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v3.md` | `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v3.md` | `08e6525abaf7` | idéntica |
| `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md` | `05-Tickets/Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md` | `837c1d666419` | idéntica |
| `05-Tickets/verificar-tickets.py` | `05-Tickets/verificar-tickets.py` | `518dd23458e4` | idéntica |
| `06-Spec-viva/HU-01.6-comprobacion-documental-20261118-v1.md` | `06-Spec-viva/HU-01.6-comprobacion-documental-20261118-v1.md` | `72a8c654e207` | idéntica |
| `06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` | `06-Spec-viva/HU-01.6-prueba-local-20261118-v1.md` | `300e2df41965` | idéntica |
| `06-Spec-viva/HU-01.6-prueba-local-resultado-20261118.txt` | `06-Spec-viva/HU-01.6-prueba-local-resultado-20261118.txt` | `20f5449c7117` | idéntica |
| `06-Spec-viva/HU-01.6-prueba-local.py` | `06-Spec-viva/HU-01.6-prueba-local.py` | `3a211edbc881` | idéntica |
| `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261118-ronda1.md` | `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261118-ronda1.md` | `cd7228e36d7a` | idéntica |
| `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261118-ronda2.md` | `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261118-ronda2.md` | `df88a3ead2ea` | idéntica |
| `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda3.md` | `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda3.md` | `c7d685c78552` | idéntica |
| `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda4.md` | `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda4.md` | `13418b2ee79c` | idéntica |
| `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda5.md` | `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda5.md` | `bcb27d5003b5` | idéntica |
| `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda6.md` | `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda6.md` | `2016d193afa8` | idéntica |
| `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda7.md` | `06-Spec-viva/Respuesta-Revision-Thibaut-Spec-inicial-20261119-ronda7.md` | `26c052934532` | idéntica |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261118-ronda1.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261118-ronda1.md` | `07e5f8b89c1d` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261118-ronda2.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261118-ronda2.md` | `7103ef7b70a1` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda3-corrida1.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda3-corrida1.md` | `de16a067d242` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda3-corrida2.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda3-corrida2.md` | `84f989e081cf` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda4-corrida1.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda4-corrida1.md` | `d13bc486f6f0` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda4-corrida2.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda4-corrida2.md` | `e6107abc6b04` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda5-corrida1.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda5-corrida1.md` | `8c470415d1a8` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda5-corrida2.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda5-corrida2.md` | `727de78691eb` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda6-corrida1.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda6-corrida1.md` | `22e29e72ce41` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda6-corrida2.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda6-corrida2.md` | `7d0611803b29` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda7-corrida1.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda7-corrida1.md` | `1d0fbfe8dae7` | **neutralizada** |
| `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda7-corrida2.md` | `06-Spec-viva/Revision-Thibaut-Spec-inicial-20261119-ronda7-corrida2.md` | `fd70dd756cbd` | **neutralizada** |
| `07-Repositorio/Respuesta-Revision-Thibaut-Harness-20261118-ronda1.md` | `07-Repositorio/Respuesta-Revision-Thibaut-Harness-20261118-ronda1.md` | `46cf065739d2` | **neutralizada** |
| `07-Repositorio/Respuesta-Revision-Thibaut-Harness-20261118-ronda2.md` | `07-Repositorio/Respuesta-Revision-Thibaut-Harness-20261118-ronda2.md` | `1f7861e110b6` | idéntica |
| `07-Repositorio/Respuesta-Revision-Thibaut-Harness-20261118-ronda3.md` | `07-Repositorio/Respuesta-Revision-Thibaut-Harness-20261118-ronda3.md` | `b5555d0db510` | idéntica |
| `07-Repositorio/Respuesta-Revision-Thibaut-README-v2-20261118-ronda1.md` | `07-Repositorio/Respuesta-Revision-Thibaut-README-v2-20261118-ronda1.md` | `33ddf273bac0` | idéntica |
| `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda1.md` | `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda1.md` | `8242fdb6dd8e` | **neutralizada** |
| `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda2.md` | `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda2.md` | `1b748fafe367` | **neutralizada** |
| `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda3-corrida1.md` | `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda3-corrida1.md` | `5f3c56ad6220` | **neutralizada** |
| `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda3-corrida2.md` | `07-Repositorio/Revision-Thibaut-Harness-20261118-ronda3-corrida2.md` | `30fd23bf6d24` | **neutralizada** |
| `07-Repositorio/Revision-Thibaut-README-v2-20261118-ronda1.md` | `07-Repositorio/Revision-Thibaut-README-v2-20261118-ronda1.md` | `c4f249c37a65` | **neutralizada** |
