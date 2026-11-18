# CLAUDE.md — reglas de proceso del Controlador de Tiempo

Este fichero se carga al abrir el repositorio con Claude Code. Dice **cómo se trabaja aquí**. Qué se construye está en `readme.md` y en `docs/prd/`; no se repite.

El repositorio es **público**. Todo lo que entra en un commit lo puede leer cualquiera.

---

## 1. Ante la duda, detenerse y preguntar

Nunca inventar un dato, una regla de negocio ni el resultado de un comando. Si falta información se pregunta; si una herramienta falla se reporta lo que pasó de verdad. Las fechas y los días de la semana se calculan con `date`, no de memoria.

## 2. Datos que no salen

- Los clientes se nombran con su alias estable (`Cliente A` … `Cliente I`) y las dos empresas como `Proveedor A` y `Proveedor B`. No se escriben nombres reales de empresas, personas, contratos ni códigos de proyecto.
- Los correos de ejemplo usan `example.com` (valen también `example.org` y `example.net`). Ningún otro dominio.
- Ningún secreto entra al repositorio. Las variables viven en `.env.local`, que git ignora; `.env.example` lleva solo los nombres, sin valores (`NOMBRE=`).
- Lo anterior vale igual para el **nombre y la ruta** de un fichero y para el **mensaje del commit**, no solo para el contenido.
- **Binarios:** solo entran imágenes (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`), y deben serlo de verdad: se comprueba la firma del formato. Un PDF, un Excel o un ZIP no entran: su contenido no se puede revisar.
- **Lo que llega por `merge`, `pull`, `cherry-pick` o `rebase` no pasa por el hook:** son commits ya hechos. Antes de traer trabajo de otra rama o de otro repositorio se revisa a mano que no traiga nada de lo anterior.
- El commit se hace con la configuración del repositorio: sin `git -c clave=valor`.
- **Los metadatos del commit también son públicos.** El correo del autor debe ser uno de los permitidos en la lista privada; un correo corporativo revela la empresa aunque el contenido esté anonimizado. La identidad se configura una vez en el clon (`git config user.email`); no se cambia en el comando del commit (`--author`, `-c user.email`).
- El hook `.claude/hooks/datos-que-no-salen.py` revisa cada commit y lo detiene si encuentra algo de lo anterior. Deja una línea en `docs/seguridad/registro-de-bloqueos.md`. Lo que revisa, y lo que no alcanza a ver, está en su cabecera.
- **Un bloqueo del hook no se rodea.** Se corrige el contenido. No se usa `--no-verify` ni se edita el hook para que pase. Única excepción: las pruebas de `tests/harness/` lo usan dentro de sus repositorios desechables, para fabricar el estado previo que el propio hook impediría crear; nunca en este repositorio.
- El nombre del autor (`git config user.name`) también es público y pasa por la lista privada.
- Si el hook dice «quedé ciego» es que falta la lista privada de nombres reales, que vive fuera de git. Se avisa a la Dirección; no se hace el commit.

## 3. Spec primero

La verdad de cada capacidad vive en `openspec/specs/<capability>/spec.md`. El orden es: spec → tests → código. Un cambio de comportamiento que no está en la spec empieza por cambiar la spec, y ese cambio lo aprueba la Dirección. Una corrección es un ciclo nuevo desde la spec, no un parche en el código.

## 4. Tests antes del código, con un positivo y un negativo

En reglas de negocio y permisos, el primer commit del ticket son los tests fallando y el segundo el código que los hace pasar. Cada pieza se ejercita al menos dos veces: un caso que debe pasar y uno que debe rechazarse. Un test que solo comprueba el caso feliz está incompleto.

## 5. Migraciones controladas

Toda migración de `supabase/migrations/` parte de `openspec/plantillas/migracion-controlada.sql`:

- **Tabla:** si ya existe, se aborta con mensaje propio; se crea; se confirma con mensaje propio.
- **Índice, llave o constraint:** si existe se elimina; se crea; se confirma. El eliminar y el crear van en **un mismo bloque**, para que no exista el estado «borrado y sin recrear».
- Cada migración lleva su validación 1 a 1 de solo lectura en `supabase/validaciones/` (esperado · encontrado · estado). La validación comprueba que el objeto existe **y que está hecho como dice la spec** (columnas y tipos, definición del índice y de la constraint).

El mensaje de éxito o de error lo redactamos nosotros: si el motor rechaza una sentencia, el bloque lo captura y lo relanza con nuestro texto. Un «Success» del motor prueba que no explotó, no que quedó bien. Los límites de la plantilla están escritos en su cabecera.

## 6. Commits y pull requests

- Antes del commit: `git branch --show-current`.
- Los ficheros se preparan por nombre (`git add <ficheros>`), nunca con `git add .` ni `git commit -a`.
- Preparar y hacer el commit van en **dos comandos separados**: el hook necesita ver lo preparado antes de que entre. En el segundo, `git commit` es la primera orden y va escrito directo, sin rutas, variables (`$MSG`) ni `$(...)`; un mensaje de varias líneas se pasa con `git commit -F - <<'EOF'`.
- **No se hace `git push` sin aprobación expresa de la Dirección.** El push al fork actualiza el pull request de la entrega.
- Ningún pull request se abre sin su revisión adversarial, hecha con un modelo distinto al que escribió el código. Se guarda en `docs/revisiones/PR-n.md`, y cada observación se cierra de una de tres formas, con su razón: se corrige, se acepta como riesgo o se descarta.
- Una tarea termina cuando la CI está en verde en el fork, no cuando el fichero quedó escrito.

## 7. Documentación al día

El cambio que altera una ruta, una tabla o una regla actualiza en el mismo pull request la spec y el README de la capability. Los prompts que produjeron cada pieza se anotan en `prompts.md`, con los ajustes humanos.

## 8. Máquina nueva

Los hooks de git no viajan con el clon. Al clonar se instalan los dos (`pre-commit`, que revisa lo preparado, y `commit-msg`, que revisa el mensaje):

```bash
bash scripts/instalar-guardarrailes.sh
```

Después se hacen dos cosas:

- Indicar dónde está la lista privada: su ruta, en una línea, en `.datos-que-no-salen.ruta` (git lo ignora), o en la variable `CT_LISTA_PRIVADA`. El formato de la lista está en la cabecera del hook.
- Configurar en el clon el correo de autor permitido: `git config user.email <correo>`. Sin eso git toma el correo global de la máquina y el hook detiene el commit.

Para comprobar los guardarraíles:

```bash
python3 tests/harness/prueba-datos-que-no-salen.py
```

```bash
python3 tests/harness/prueba-instalar-guardarrailes.py
```
