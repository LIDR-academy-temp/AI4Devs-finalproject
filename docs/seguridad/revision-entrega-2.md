# Revisión de seguridad de la Entrega 2

| | |
|---|---|
| **Fecha** | 2 de noviembre de 2026 |
| **Actividad** | A14 del [plan](../plan/plan-implementacion-entrega-2.md): revisión corta de secretos, autorización, sesión y entradas |
| **Realizada por** | Claude (asistente de IA), con supervisión del responsable |
| **Resultado** | Sin hallazgos críticos abiertos. Se corrigieron 11 hallazgos y quedan 6 riesgos aceptados |

**Alcance y límites.** Es una revisión corta, no una auditoría ni una prueba de penetración independiente. Tampoco es una verificación completa de OWASP ASVS, que queda como la extensión X4 del plan. Se hizo sobre la **configuración de producción en una pila local aislada** con datos ficticios, porque el despliegue en la nube está pospuesto ([ADR-0002](../decisions/0002-proveedor-del-servidor.md)). Cuando exista un servidor real, hay que repetirla allí.

## 1. Secretos en el historial

Se revisó una copia espejo del fork público: 3 ramas y 41 commits.

| Control | Resultado |
|---|---|
| Fragmentos conocidos de la URL y de las credenciales de SAT2 | Sin coincidencias |
| Archivos `.env`, claves privadas y similares | Solo `.env.example` sin valores, y uno de otro proyecto en la base de LIDR |
| Tokens de GitHub y claves de API de Google | Sin coincidencias |
| Claves de AWS | Una, en la base de LIDR: es la clave de ejemplo de la documentación de AWS |
| [Gitleaks](https://github.com/gitleaks/gitleaks) 8.28 | 5 coincidencias, ninguna propia |

Las 5 coincidencias de Gitleaks, y los 5 JWT que aparecen con ellas, están en el commit `64a9d6a`, de otro autor, en la rama `main` de la base de LIDR. Son ejemplos de documentación, como `Bearer YOUR_TOKEN`. Ese commit también trae un `vetconnect/env.example.txt` con una contraseña de PostgreSQL de 8 caracteres, en un archivo de ejemplo de otro proyecto. Ninguno está en el estado actual de la rama de entrega ni en commits de este trabajo.

**Límite.** La búsqueda usa fragmentos conocidos y patrones, sin comparar con los valores reales del `.env`, porque esta revisión no lo lee. El commit `d9d7dcc` del repositorio anterior, que contiene una bitácora y un nombre de usuario, no está en este fork, pero sigue visible en aquel repositorio.

## 2. Pruebas negativas

Son 77 comprobaciones, reproducibles con [`backend/herramientas/pruebas_negativas.py`](../../backend/herramientas/pruebas_negativas.py). Todas pasan tras las correcciones.

| Área | Qué se comprobó | Resultado inicial |
|---|---|---|
| **Sesión** | Atributos `Secure`, `HttpOnly`, `SameSite` y `Path` de la cookie. El cierre de sesión, restablecer la clave y desactivar la cuenta cortan la sesión en el servidor | Correcto |
| **Autenticación** | Todas las rutas del contrato responden 401 sin sesión, y también con cookies inventadas, vacías, largas o con inyección | Correcto |
| **Autorización** | Otra cuenta recibe 403 en la estación ajena, y no se puede leer un sensor ajeno a través de una estación propia | Correcto |
| **Bloqueo y enumeración** | Bloqueo tras 5 fallos, incluso con la clave correcta y con mayúsculas o espacios en el correo. Mismo mensaje y tiempos comparables exista o no la cuenta | Correcto |
| **Entradas** | Inyección SQL, tipos erróneos, JSON roto, identificadores y fechas fuera de rango, cuerpos enormes | **Con hallazgos** |
| **Archivos** | `.env`, `.git/config` y recorrido de rutas: el proxy no entrega nada de eso | Correcto |
| **Cabeceras** | HSTS, `nosniff`, marcos, referencia, política de contenido y cabecera `Server` | **Con hallazgos** |
| **Aislamiento** | La API no recibe credenciales de SAT2, solo se publican los puertos 80 y 443, y la API y el worker no corren como root | Correcto |
| **Carga** | Ráfaga de 180 ingresos, con 60 simultáneos | **Con hallazgo** |

También se auditaron las dependencias con `npm audit` (0 vulnerabilidades) y `pip-audit`. Este último solo informó sobre `pip`, que no es parte de la aplicación (ver R5).

## 3. Hallazgos corregidos

| # | Severidad | Hallazgo | Corrección | Evidencia |
|---|---|---|---|---|
| H1 | **Alta** | Una ráfaga de ingresos llevaba la memoria de la API a 1068 MiB, porque cada cálculo de Argon2 reserva unos 64 MiB. En un servidor de 2 GB, unas pocas peticiones anónimas podían agotarla | Tope de 4 cálculos simultáneos | El pico bajó a 362 MiB. Prueba de regresión |
| H2 | Media | Un correo con carácter nulo causaba un error 500 sin autenticar | Se rechazan los caracteres de control, con 422 | Prueba de regresión |
| H3 | Media | Un cuerpo enorme llegaba hasta la API | Límite de 64 KB en el proxy, con 413 | Prueba negativa |
| H4 | Media | Local publicaba el puerto 8080 en toda la red, sin HTTPS, con la sesión sin cifrar | Solo se publica en `127.0.0.1` | E2E y clon limpio |
| H5 | Baja | Un identificador mayor que BIGINT causaba un error 500 | Validación con 422 | Prueba de regresión |
| H6 | Baja | Fechas extremas causaban un error 500 por desbordamiento | Se admiten entre los años 2000 y 2100 | Prueba de regresión |
| H7 | Baja | Sin política de contenido (CSP) | CSP estricta en la aplicación | La E2E falla si bloquea algo |
| H8 | Baja | `Server` revelaba Caddy y uvicorn | Se quita la cabecera | Prueba negativa |
| H9 | Baja | Sin HSTS | Cabecera en todas las respuestas | Prueba negativa |
| H10 | Baja | Sin `nosniff`, sin protección contra marcos ni política de referencia | Cabeceras en todas las respuestas | Prueba negativa |
| H11 | Baja | La cookie segura dependía de configurar una variable en producción | `docker-compose.prod.yml` la fija, y exige contraseña de base, dominio y modo | Prueba negativa |

H9, H10 y H11 se corrigieron en A13, durante la preparación de la configuración de producción.

## 4. Riesgos aceptados para el MVP

| # | Riesgo | Por qué se acepta | Cuándo revisarlo |
|---|---|---|---|
| R1 | **Sin límite por dirección IP.** Quien envíe muchos correos distintos evita el bloqueo y consume CPU, aunque ya no agota la memoria | Las claves son aleatorias, de 96 bits, y no hay registro ni cambio de clave por el usuario, así que adivinarlas no es viable. Caddy requiere un módulo adicional para limitar por IP | Antes de exponerlo a internet |
| R2 | **Bloqueo ajeno.** Quien conozca un correo puede bloquear esa cuenta 15 minutos con 5 intentos | Molestia acotada. Es el costo del bloqueo por cuenta | Si ocurre en la práctica |
| R3 | **`/api/docs` es público** y carga recursos de un CDN | No expone datos, y el contrato ya está en el repositorio público | Antes del uso comercial |
| R4 | **La API usa el usuario propietario de la base** y no uno con permisos mínimos | Una sola aplicación, sin puerto publicado, y consultas parametrizadas | Con el pipeline o más servicios |
| R5 | **Imágenes por etiqueta y no por digest**, y `pip` en la imagen de Python con avisos conocidos (`PYSEC-2026-196`, `PYSEC-2026-3721`) | `pip` solo se usa al construir la imagen, para instalar `uv`, y no al ejecutar la aplicación | Con el pipeline |
| R6 | **Caddy y PostgreSQL corren como root** dentro de sus contenedores | Son las imágenes oficiales, y el contenedor limita el alcance | Con el pipeline |

## 5. Pendiente

- Repetir las pruebas negativas sobre el servidor real cuando se retome el despliegue.
- Comprobar por fuera de esta revisión que el `.env` real no se filtró, comparando sus valores con el historial.
- Rotar las credenciales que estén en el repositorio privado del prototipo, como ya está anotado.
- Antes de un uso comercial: la extensión X4 (OWASP ASVS, nivel 1), una revisión independiente y los riesgos R1 y R3.
