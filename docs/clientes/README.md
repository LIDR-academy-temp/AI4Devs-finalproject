# Manual de operación de Weather Track

Weather Track responde una sola pregunta: **¿puedo aplicar fitosanitarios ahora sin riesgo de deriva?** Para eso lee cada 10 minutos la estación meteorológica en SAT2, calcula una recomendación y la muestra a los usuarios.

Este manual es para **quien instala y opera** Weather Track en un establecimiento. Explica cómo ponerlo en marcha, cómo saber que funciona, qué hacer ante cada aviso y cómo respaldar los datos. No hace falta saber programar: alcanza con abrir una terminal y copiar los comandos.

## Qué necesitás

| Requisito | Para qué |
|---|---|
| Una computadora con Docker, Git y unos 5 GB de disco libres | Correr Weather Track. Los detalles están en la [guía de instalación](../despliegue/instalacion-local.md#qué-necesitás) |
| Una cuenta de servicio de SAT2 | Leer la estación. Sin ella, Weather Track funciona con datos de demostración |
| Una dirección de correo propia | Ser administrador y recibir los avisos |
| Un lugar seguro fuera de esa computadora | Guardar los respaldos y una copia del archivo `.env` |

## Capítulos

| Capítulo | Cuándo leerlo |
|---|---|
| [1. Puesta en marcha](01-puesta-en-marcha.md) | El primer día |
| [2. Lo que ven los usuarios](02-lo-que-ven-los-usuarios.md) | Para responder consultas de los usuarios |
| [3. Cuentas y administradores](03-cuentas-y-administradores.md) | Para dar de alta, bloquear o exportar cuentas |
| [4. SAT2 y sus claves](04-sat2-y-sus-claves.md) | Para cargar o cambiar las credenciales de SAT2 |
| [5. Monitoreo y avisos](05-monitoreo-y-avisos.md) | Cuando llega un correo de alerta o el semáforo no está en verde |
| [6. Respaldo y restauración](06-respaldo-y-restauracion.md) | Una vez por semana, y ante un problema |
| [7. Actualización](07-actualizacion.md) | Cuando hay una versión nueva |
| [8. Seguridad, problemas frecuentes y glosario](08-seguridad-problemas-y-glosario.md) | Siempre que algo no esté claro |

## Cómo leer los comandos

Cada comando va en su propio bloque y se ejecuta en una terminal, desde la carpeta `weather-track`. En Windows, usá PowerShell. Los correos y nombres de los ejemplos son ficticios: reemplazalos por los tuyos.

> La recomendación de Weather Track es **orientativa**. No reemplaza el criterio de un profesional ni la etiqueta del producto. Los pesos y los cortes del índice todavía no tienen validación agronómica.
