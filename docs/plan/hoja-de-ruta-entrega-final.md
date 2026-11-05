# Hoja de ruta hacia la entrega final

| | |
|---|---|
| **Proyecto** | Weather Track |
| **Entrega final** | 9 de diciembre de 2026 |
| **Punto de partida** | Entrega 2 presentada en forma anticipada ([pull request](https://github.com/LIDR-academy-temp/AI4Devs-finalproject/pull/14)) |
| **Responsable** | Pablo Guillermo Di Nanno |
| **Versión** | 1.2, 4 de noviembre de 2026 |

Este documento registra qué línea de trabajo está activa, cuál está en pausa y qué falta decidir, para no perder el hilo entre sesiones.

## 1. Estado de las líneas de trabajo

| Línea | Estado | Condición para avanzar |
|---|---|---|
| **D. Pendientes de la devolución de la Entrega 1** | **Activa, primero** | Los puntos rápidos (D1 a D3) van antes de implementar la línea A |
| **A. Instalación local, como la quiere el responsable** | **Activa** | Que el responsable verifique la aplicación local y la apruebe |
| **B. Despliegue público en Google Cloud (opción plus)** | **En pausa** desde el 2 de noviembre de 2026 | Terminar la línea A |
| C. Pipeline, monitoreo y documentación para clientes | Sin empezar | Se ordenan después de la línea A. Incluye D4 y D5 |

## 2. Línea A: cuentas propias con registro, ingreso y recupero

Hasta el 3 de noviembre de 2026 las cuentas las creaba un administrador por línea de comandos (requisito "Alta de cuentas sin registro público" de la especificación `account-access`). El responsable decidió cambiarlo, y el cambio de OpenSpec `weather-track-registro-cuentas` **reemplaza ese requisito**. Desde el 4 de noviembre hay registro público; la especificación principal se actualiza al archivar el cambio.

### Objetivos

1. **Ingreso, registro y recupero.** Una persona puede crear su cuenta, ingresar y recuperar el acceso sin ayuda del administrador.
2. **Credenciales de SAT2 aisladas de las cuentas.** Registrarse nunca pide, muestra ni usa credenciales de SAT2.
3. **Base de clientes.** Las cuentas registradas forman una base de clientes potenciales, con su consentimiento.

### Definición

El contrato, el diseño y las tareas están en el cambio de OpenSpec [`weather-track-registro-cuentas`](../../openspec/changes/weather-track-registro-cuentas/proposal.md). Resumen:

| Tema | Definición |
|---|---|
| **Identidad** | Propia, en la base local de Weather Track, sin proveedores externos |
| **Usuario** | El correo electrónico, como hoy |
| **Registro** | Nombre, apellido, correo, contraseña, localidad y provincia; organización y teléfono opcionales. Aceptación de términos y de la política de privacidad |
| **Confirmación** | Correo con un enlace de un solo uso, válido 48 horas, y una leyenda para darse de baja. Sin confirmar no se puede ingresar |
| **Borrado** | Si no confirman a tiempo o se dan de baja, la cuenta se borra de la base con todos sus datos |
| **Acceso** | Sin niveles de usuario: toda cuenta confirmada usa la aplicación con todas las estaciones |
| **Recupero de contraseña** | Enlace de un solo uso, válido 30 minutos. La respuesta es la misma exista o no la cuenta. Al cambiar la clave se cierran las sesiones |
| **Recupero de usuario** | Indicación en pantalla de que el usuario es el correo |
| **Autogestión** | "Mi cuenta": editar datos, cambiar la contraseña y darse de baja |
| **Contraseñas** | De 15 a 128 caracteres, sin reglas de composición y sin contraseñas comunes, según NIST SP 800-63B-4 y OWASP ASVS 5.0 |
| **Correo en local** | Mailpit, un contenedor que atrapa todos los correos y los muestra en una página local. No envía nada a internet |
| **Correo en producción** | Un proveedor de envío, a elegir cuando se retome la línea B |
| **Base de clientes** | Las cuentas confirmadas, con su consentimiento registrado, exportables a CSV por el administrador |
| **Datos personales** | Informar la finalidad y cómo pedir acceso, corrección o supresión, según la Ley 25.326. Antes de usar la base comercialmente, confirmar con asesoría legal la inscripción ante la Agencia de Acceso a la Información Pública |

### Aislamiento de las credenciales de SAT2

Ya se cumple y debe seguir así:

- Las credenciales están solo en el `.env` del servidor y las recibe solo el worker. La API no las recibe (`docker-compose.yml`).
- Las cuentas del sitio y la cuenta de SAT2 no tienen relación: una persona registrada consulta lo que el worker ya guardó en la base.
- **Se agrega una prueba automática** que falle si la API llega a recibir esas variables.

### Seguridad que exige el registro público

- **El límite por IP deja de ser opcional.** Era un riesgo aceptado (R1 en la [revisión de seguridad](../seguridad/revision-entrega-2.md)) y quedó resuelto: se aplica a ingreso, registro, recupero, reenvío de la confirmación y uso de enlaces.
- El campo trampa contra robots simples no entró en el cambio aprobado: el límite por IP y el tope de 3 correos por hora a cada dirección cubren ese abuso (riesgo R7). Un campo trampa o un CAPTCHA se evalúan solo si aparece abuso.
- Los enlaces de verificación y recupero se guardan como hash, igual que las sesiones.
- Se amplían las pruebas negativas y las de extremo a extremo con los flujos nuevos.

### Estaciones

Una estación es solo una central meteorológica que llega de SAT2, un "equipo". Hoy hay una, INTA Pergamino. El cambio [`weather-track-estaciones`](../../openspec/changes/weather-track-estaciones/proposal.md) ajusta la aplicación a esa definición:

| Tema | Definición |
|---|---|
| **Selector** | En el encabezado, siempre visible, aunque haya una sola estación |
| **Equipo que deja de llegar de SAT2** | Sigue en el selector con la leyenda "Equipo inactivo - solo históricos" y la lista de sus sensores, sin el tablero instantáneo |
| **Modo simulado** | La estación se llama como la real, con el aviso "Datos simulados" |
| **Modo de prueba** | Reemplaza al modo `escenarios`: "Caso de prueba - 1", con los datos guardados, y "Caso de prueba - 2", sin ingesta. Con datos reales, trabaja sobre una copia de la base |
| **Situaciones de la recomendación** | Se prueban cargándolas en la base aislada de cada prueba, nunca como estaciones |
| **Datos reales y ficticios** | Nunca se mezclan en una misma base |

### Pasos

- [x] Responder las preguntas abiertas (sección 5)
- [x] Proponer los cambios de OpenSpec de cuentas y de estaciones
- [x] El responsable aprueba los cambios (3 de noviembre de 2026)
- [x] Implementar las tareas, cada grupo con sus pruebas y su documentación. `weather-track-estaciones`: 20 de 20, el 4 de noviembre de 2026. `weather-track-registro-cuentas`: 33 de 34 el 4 de noviembre de 2026; falta la verificación del responsable (tarea 8.4)
- [ ] **El responsable verifica la aplicación local** y la aprueba

## 3. Línea B: despliegue público en Google Cloud, en pausa

El 2 de noviembre de 2026 se revisó, en modo solo lectura y sin credenciales, el proyecto de Firebase que el responsable ya usa para pruebas y el repositorio privado que lo alimenta. No se cambió nada. La tarea 11.2 del cambio del núcleo, el despliegue en Google Cloud, quedó abierta en esta línea cuando ese cambio se archivó, el 3 de noviembre de 2026.

**Qué se aprendió:**

- Firebase Hosting solo sirve páginas estáticas y no puede alojar el worker ni PostgreSQL. Se mantiene la propuesta del [ADR-0002](../decisions/0002-proveedor-del-servidor.md): una máquina virtual con la pila de Compose, ahora **dentro del proyecto existente**, sin cuenta de servicio, para que no pueda tocar los datos de ese proyecto.
- El sistema existente ya se conecta con SAT2 desde Google Cloud, así que el riesgo de IP bloqueada casi desaparece.
- Ese sistema usa la misma cuenta de SAT2 y otra lógica de decisión. Hay que decidir cuál es la referencia antes de mostrar ambos a un cliente.
- Se encontró un hallazgo de seguridad en el sistema existente, ajeno a Weather Track. **El detalle y el inventario completo están en una nota privada del responsable, fuera del repositorio.**

**Al retomar:**

| Tipo | Pendiente |
|---|---|
| Revisar | Facturación, servicios y regiones, disparadores, registros, permisos y reglas, con la sesión de `gcloud` y `firebase` del responsable |
| Hacer | Corregir el hallazgo del sistema existente; decidir la lógica de referencia; confirmar el dominio; elegir el proveedor de correo y configurar SPF, DKIM y DMARC; crear la máquina virtual y desplegar; repetir las pruebas negativas sobre el servidor real |
| Documentar | Actualizar el ADR-0002 y la [guía de despliegue](../despliegue/despliegue-gcp.md) con lo que se haga |
| Inventariar | Completar el inventario privado con lo que muestre la consola |

## 4. Línea D: pendientes de la devolución de la Entrega 1

LIDR revisó la Entrega 1 el 2 de noviembre de 2026 con el resultado **"Luz verde · lista para implementar"** y las nueve partes obligatorias completas. Destacó que el producto sea la decisión y no un tablero, que el sistema desconfíe de sus propios datos, la coherencia de la arquitectura y el motor como función pura. Recalculó a mano los casos de referencia y coinciden.

### Observaciones ya resueltas por la Entrega 2

| Observación | Cómo quedó |
|---|---|
| Cómo se crean las cuentas | Registro público con confirmación por correo (F1), desde el 4 de noviembre de 2026. El comando de administración queda para cuentas de demostración |
| Cómo se carga el histórico | Carga inicial de 31 días (F6) |
| Umbral de 30 minutos en un solo lugar | `ANTIGUEDAD_MAXIMA` en `backend/app/dominio/vigencia.py`, usado por la recomendación y las condiciones actuales |
| Tests | Backend, frontend y extremo a extremo; el motor con 100 % de cobertura |
| Carpeta `openspec/` en la rama | Existe, con el cambio del núcleo |
| IA en implementación y pruebas | Hecha con OpenSpec y Claude Code; falta que se vea en las reglas del asistente (D1) |

### Pendientes

| # | Pendiente | Esfuerzo | Fase de IA que refuerza |
|---|---|---|---|
| D1 | **Hecho el 3 de noviembre de 2026.** [`CLAUDE.md`](../../CLAUDE.md) con el stack, la regla de que el dominio no depende de otras capas, los comandos de test y la norma de trabajar un ticket por vez. Fue el segundo de los tres pasos que pidió LIDR | Bajo | Implementación |
| D2 | **Hecho el 3 de noviembre de 2026.** Alinear el README: dependencias de los tickets (sección 6) según el orden real, es decir motor puro, acceso y endpoints, y contratos de inicio de sesión, cierre de sesión y estaciones en la API (sección 4) | Bajo | Diseño |
| D3 | **Hecho el 3 de noviembre de 2026.** Completar en `prompts.md` las secciones que solo remiten a la 2.1, con las propuestas aprobadas y no solo el prompt inicial | Bajo | Diseño |
| D4 | Pipeline de GitHub Actions redactado con IA y revisado por el responsable (línea C) | Medio | Despliegue |
| D5 | Revisión de pull requests asistida por IA y documentación viva a partir de las specs de OpenSpec (línea C) | Medio | Mantenimiento |
| D6 | Opcional: tests basados en propiedades con Hypothesis. Con cualquier combinación de lecturas, nunca "apto" con inversión o lectura sospechosa, y una mayor diferencia térmica nunca baja el índice | Medio | Pruebas |
| D7 | Datos de prueba con la forma de las respuestas reales de SAT2, para detectar cambios del proveedor. **Decisión pendiente del responsable:** el contrato con SAT2 es privado, así que la propuesta es guardar solo la estructura, con valores reemplazados | Bajo | Pruebas |

### Balance de alcance

LIDR elogió el alcance acotado de la Entrega 1 ("cuentas creadas por ti"). Los cambios de cuentas y de estaciones de la línea A lo amplían en unas 58 tareas, con el 9 de diciembre como límite. Por eso D1 a D3, que son baratos y los pidió la academia por escrito, van antes. D4 y D5 se ordenan en la línea C, y D6 entra solo si sobra tiempo.

## 5. Preguntas resueltas

Respuestas del responsable del 3 de noviembre de 2026:

1. **Credenciales de SAT2.** Solo en el servidor. El contrato con SAT2 es privado de Weather Track, que presta los datos cosechados.
2. **Cuenta nueva.** Al confirmar el correo entra a la aplicación funcional. No hay niveles ni clasificación de usuarios por ahora.
3. **Recupero de usuario.** Sin respuesta explícita; se adopta la indicación de que el usuario es el correo.
4. **Datos para la base de clientes.** Sin campos adicionales por ahora.
5. **Aprobación.** No hay aprobación del administrador: la confirmación del correo habilita la cuenta. Quien no confirma o se da de baja se borra de la base.

## 6. Registro de decisiones

| Fecha | Decisión |
|---|---|
| 2 nov 2026 | Entrega 2 presentada en forma anticipada |
| 2 nov 2026 | Se pausa el despliegue en Google Cloud hasta terminar la instalación local |
| 2 nov 2026 | Se agregan registro, ingreso y recupero de cuentas para formar una base de clientes, con las credenciales de SAT2 aisladas de las cuentas |
| 3 nov 2026 | Identidad propia y local; confirmación por correo con baja; borrado de cuentas sin confirmar o dadas de baja; sin niveles de usuario |
| 3 nov 2026 | Estación = equipo de SAT2; selector siempre visible; equipos inactivos con solo históricos; modo de prueba en lugar de `escenarios` |
| 3 nov 2026 | Se aprueban los cambios `weather-track-registro-cuentas` y `weather-track-estaciones` |
| 3 nov 2026 | Se suman los pendientes de la devolución de la Entrega 1 como línea D; D1 a D3 van primero |
| 4 nov 2026 | Implementados el registro público, el recupero, «Mi cuenta», las bajas y la exportación de clientes; R1 resuelto. Queda la verificación del responsable |
