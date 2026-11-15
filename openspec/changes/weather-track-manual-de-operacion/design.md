# Design

## Context

Ver `proposal.md`, sección Why. Lo que ya existe y condiciona el enfoque:

- [`docs/despliegue/instalacion-local.md`](../../../docs/despliegue/instalacion-local.md) ya está escrita para alguien sin conocimientos de programación, con voseo. Cubre la instalación, los datos reales de SAT2, el monitoreo, los modos de datos y los problemas frecuentes. No cubre el respaldo, la restauración ni qué hacer ante cada aviso.
- Los tipos de alerta están en `TIPOS_ALERTA` (`app/datos/modelos.py`).
- Los estados del semáforo están en `app/monitoreo/salud.py`.
- Los comandos de administración están en el analizador de `app/administracion.py`.
- Las capturas de `docs/capturas/` son anteriores a la salud de la estación, a Administración y a «Mi cuenta» con su enlace de vuelta.
- Al redirigir con `>` en PowerShell, la salida se guarda en UTF-16. Un respaldo binario así queda corrupto: ya pasó con la captura de SAT2.

## Goals / Non-Goals

**Goals:**

- Un operador puede poner en marcha, mantener y recuperar Weather Track solo con el manual y la guía de instalación.
- Ante cada correo de alerta o color del semáforo, el operador sabe qué revisar.
- El manual no queda viejo sin que una prueba lo note.

**Non-Goals:**

- Una guía para el productor o una ficha comercial: el responsable eligió solo a quien instala y opera.
- Ayuda dentro de la aplicación, un PDF o un sitio de documentación.
- Respaldos automáticos programados: se documenta el procedimiento manual.
- El despliegue en Google Cloud (línea B, en pausa).

## Decisions

### D1. Un manual por capítulos en `docs/clientes/`

`README.md` es la portada: a quién va dirigido, qué hace falta y el índice. Después vienen los capítulos numerados:

1. Puesta en marcha
2. Lo que ven los usuarios
3. Cuentas y administradores
4. SAT2 y sus claves
5. Monitoreo y avisos
6. Respaldo y restauración
7. Actualización
8. Seguridad, problemas frecuentes y glosario

**Alternativa descartada:** un solo archivo largo. En GitHub se navega peor y cada cambio toca el mismo archivo.

### D2. La guía de instalación es la única fuente para instalar

El manual enlaza las secciones de `instalacion-local.md` en lugar de copiar sus comandos, para que no haya dos versiones que se contradigan. Lo que hoy está solo en la guía y es de operación, como «Problemas frecuentes», se queda en la guía y el manual lo enlaza.

### D3. Respaldo con `pg_dump` dentro del contenedor y `docker compose cp`

El respaldo y la restauración usan el formato propio de PostgreSQL:

- **Respaldo:** `pg_dump -Fc` escribe el archivo dentro del contenedor `db`, y `docker compose cp` lo saca a la carpeta `respaldos/`.
- **Restauración:** se detienen la API y el worker, se copia el archivo al contenedor, se ejecuta `pg_restore --clean --if-exists` y se vuelve a levantar la pila. La migración de Alembic no hace nada si la base ya está al día.

Ningún paso usa la redirección `>`, que en PowerShell corrompe el archivo. `respaldos/` se agrega a `.gitignore`, porque un respaldo tiene datos personales y los hashes de las contraseñas.

El respaldo de la base no incluye el `.env`. Sin la misma `SAT2_CLAVE_PRIVADA`, la configuración cifrada de SAT2 no se puede leer, así que el manual pide guardar el `.env` por separado y protegido. Si se pierde, hay que volver a cargar las credenciales en «Administración».

**Alternativas descartadas:**

- Copiar el volumen de Docker: obliga a detener todo y depende del sistema operativo.
- Un comando propio de respaldo: más código que mantener para lo que dos comandos estándar ya resuelven.

### D4. Una prueba que ata el manual al código

`backend/tests/test_manual_operacion.py` lee lo que el sistema define y comprueba que el manual lo mencione:

- cada valor de `TIPOS_ALERTA`;
- cada estado del semáforo, salvo `MODO_PRUEBA`, que se explica junto a los otros;
- el aviso de worker detenido de Grafana;
- cada comando del analizador de administración.

Además, comprueba que cada enlace relativo y cada imagen del manual existan. Es el mismo enfoque de la guía de especificaciones (D5 de la línea C): el error nombra lo que falta.

### D5. Capturas en un proyecto aislado con datos ficticios

Se toman en `wt-doc` con un script de Playwright, a 1100 píxeles y a 360 para el móvil, con valores ficticios en «Administración». Siguen la convención que el README ya tenía:

- **Modo simulado:** la decisión «Apto», el detalle de un sensor, el móvil y «Administración». Con el nombre de la estación real y el aviso «Datos simulados», y la franja de salud «En vivo», porque el worker ejecuta ciclos.
- **Modo prueba:** «No aplicar», «Datos insuficientes» y el selector, con las situaciones cargadas en «Caso de prueba - 1».

Se renuevan solo las pantallas que cambiaron. El acceso y el equipo inactivo quedan como estaban. Antes de versionarlas se revisa que no muestren correos reales, credenciales ni la dirección de SAT2.

### D6. Tono

Castellano con voseo, como la guía de instalación: frases cortas, un comando por bloque y nada de jerga de desarrollo sin explicar. Cada término técnico inevitable, como worker, ciclo o respaldo, va al glosario.

## Risks / Trade-offs

- **[Riesgo]** Un comando del manual deja de funcionar sin que la prueba lo note, porque la prueba no ejecuta comandos. → **Mitigación:** el respaldo y la restauración se prueban de punta a punta en `wt-doc` antes de publicarse. Los demás comandos ya están probados en la guía de instalación, y el manual los enlaza.
- **[Riesgo]** Restaurar sobre la instalación real borra lo que haya en ella. → **Mitigación:** el manual pide un respaldo nuevo antes de restaurar y explica cómo ensayar la restauración en un proyecto aparte, con `-p`.
- **[Trade-off]** Al enlazar en lugar de copiar, el operador salta entre dos documentos. Se acepta a cambio de una sola fuente.
