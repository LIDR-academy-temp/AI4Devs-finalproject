# Recorte para la entrega del 09/12/2026

> Versión 3 · miércoles 18/11/2026. Decisiones D-73, D-74 y D-75 de la Dirección.
> **Qué cambió frente a la versión 2** (hallazgos 2 y 5 de la segunda ronda de revisión de la
> especificación inicial): la petición de aviso nombra la asignación que la pantalla ofreció, para
> que un reintento no registre la siguiente · H-4 anota además las marcas de la cookie de sesión.
> **Qué cambió frente a la versión 1** (hallazgos 4, 5, 6 y 13 de la primera ronda de revisión de
> la especificación inicial): el correo que no salió sí se vuelve a intentar, por la regla misma
> del correo; lo que se difiere son la suplencia y los escenarios de punta a punta · HU-07.CA-15
> queda en parte · H-4 repite contra el servicio gestionado tres pruebas del servicio de
> autenticación · el aviso lo escribe el sistema, no la sesión del consultor. Tickets, tallas y
> tramos no cambian.
> Parte de `Tickets-MVP-Controlador-de-Tiempo-20261118-v4.md`, que **sigue siendo el plan
> completo y no cambia**: este documento dice qué parte de él se construye para la entrega del
> curso. Cuando se apruebe la especificación inicial (H-1) y los tickets pasen a su versión 5,
> lo que aquí se ajusta entra allí.
> Documento anonimizado.

**Totales:** 30 tickets en el plan completo · 22 entran · 8 se difieren · 1 ticket nuevo de
despliegue (H-4) · **23 tickets en la entrega** · tallas: 5 S y 18 M · 11 tramos (0 a 10).

**Qué queda funcionando:** una persona entra con su cuenta en la versión web, desde el navegador
de su celular o de su computadora; el consultor avisa su inicio con un toque; al vencer el margen
el sistema genera el reporte de no reportados y le envía un correo a cada supervisor con los suyos;
todo separado por organización y por rol, y desplegado.

## 1. Lo que entra

| Historia | Tickets que entran | Cuántos |
|---|---|---|
| Habilitación | H-1, H-2, H-3 y **H-4 (nuevo)** | 4 |
| HU-01 · Entrar | HU-01.1, HU-01.2, HU-01.3, HU-01.6 | 4 |
| HU-02 · Roles | HU-02.1, HU-02.2, HU-02.4 | 3 |
| HU-03 · Separación | HU-03.1, HU-03.2, HU-03.3 | 3 |
| HU-06 · Aviso | HU-06.1, HU-06.2, HU-06.3, HU-06.4 | 4 |
| HU-07 · Reporte | HU-07.1, HU-07.2, HU-07.3, HU-07.4, HU-07.5 | 5 |
| **Total** | | **23** |

**Suma:** 4 + 4 + 3 + 3 + 4 + 5 = 23.

## 2. Lo que se difiere

Diferido no es descartado: los ocho siguen en el plan completo con su número.

| Ticket | Qué era | Qué pasa mientras tanto |
|---|---|---|
| HU-01.4 | Enlace de contraseña | Las cuentas nacen con los datos de arranque (H-3), con contraseña ya fijada |
| HU-01.5 | Pantallas de contraseña y de «olvidé mi contraseña» | No hay recuperación: la contraseña la repone quien administra los datos de arranque |
| HU-02.3 | Pantalla de inicio según rol | El consultor llega a su pantalla de aviso; quien no tiene asignación ve un mensaje simple |
| HU-07.6 | Bordes de la clasificación: dos asignaciones el mismo día, consultor desactivado, aviso posterior, concurrencia | Los datos de demostración no traen esos casos |
| HU-07.7 | Suplencia de la dirección y reintento del correo | No hay suplencia. El correo que no salió entra en el de la ejecución siguiente, porque el correo lleva todo lo que está sin notificar (regla de HU-07.4); lo que no entra son las pruebas propias del reintento. Queda a la vista en el registro de la ejecución |
| HU-07.8 | Escenarios de punta a punta del correo | La entrega del correo se comprueba a mano en el despliegue (H-4) |
| HU-10.1 | Consulta por fecha | El supervisor se entera por el correo; no hay consulta en pantalla |
| HU-10.2 | Pantalla de consulta | Igual |

## 3. Lo que se ajusta en los tickets que entran

| Ticket | Ajuste | Por qué |
|---|---|---|
| HU-01.2 | Deja fuera el cierre de las demás sesiones al fijar una contraseña (HU-01.CA-11). La duración de la sesión la controla el sistema (D-69) | Sin HU-01.4 no hay forma de fijar una contraseña |
| HU-06.3 | El aviso lo escribe en la base el sistema, después de aplicar la regla; la petición no dice de quién es, y la asignación que nombra solo se registra si es la que toca | Con la sesión del consultor escribiendo directo, la hora y la asignación se podían falsear |
| HU-07.4 | Entrega el correo al servicio sin suplencia. Lleva lo que esté sin notificar de las últimas 24 horas, así que lo que no salió entra en la ejecución siguiente | La suplencia era de HU-07.7 |
| HU-07.5 | Ya no depende de HU-07.6. Deja fuera los escenarios de aviso posterior y de concurrencia (HU-07.CA-20) | Eran de HU-07.6 |
| **H-4 (nuevo)** | Despliegue de la aplicación y de la base, con tres comprobaciones: un correo de ejemplo llega a un buzón · avisar toma menos de 5 segundos con sesión vigente · y las pruebas P1, P2 y P5 de HU-01.6 se repiten contra el servicio gestionado, con una cuenta de ejemplo, anotando con qué marcas llega la cookie de sesión. Tipo Test, talla M. Depende de HU-06.4, HU-07.4 y HU-07.5. Origen: T-11 del README v2 | La entrega lo necesita y no tenía ticket |

**Criterios que este recorte deja sin comprobar.** Además de los que el plan completo ya tenía en
parte o en espera: HU-01.CA-8 a CA-11 (enlace y cierre de sesiones), HU-02.CA-11 (inicio según
rol), HU-07.CA-12, CA-16, CA-18, CA-19 y CA-20 (bordes y suplencia) y los nueve de HU-10. **En
parte:** HU-07.CA-10 (entra la regla, no los escenarios de punta a punta) y HU-07.CA-15 (el
reporte queda generado dentro del plazo; consultarlo en pantalla espera a HU-10). El cruce criterio por criterio se hace en la versión 5 de los tickets.

## 4. Orden: once tramos

Dentro de un tramo, ningún ticket depende de otro del mismo tramo. Calculado sobre las
dependencias de la versión 4, con los ajustes de la sección 3.

| Tramo | Tickets | Cuántos | Qué queda funcionando |
|---|---|---|---|
| 0 | H-2, HU-01.6 | 2 | Integración continua en verde; el servicio de autenticación probado |
| 1 | H-1 | 1 | Especificación inicial refutada y aprobada |
| 2 | HU-03.1 | 1 | Organizaciones en la base y comprobación de estructura |
| 3 | HU-01.1, HU-03.2 | 2 | Usuarios; filtro por organización en el código |
| 4 | HU-01.2, HU-06.1 | 2 | Sesión; modelo del aviso |
| 5 | HU-01.3, HU-02.1, HU-06.2 | 3 | Se puede entrar; roles en la base; regla del aviso |
| 6 | H-3, HU-02.2, HU-07.1 | 3 | Datos de prueba; autorización; modelo del no reportado |
| 7 | HU-02.4, HU-03.3, HU-07.2 | 3 | Permisos y separación probados; núcleo del reporte |
| 8 | HU-06.3, HU-07.3 | 2 | El aviso se registra y el reporte se genera |
| 9 | HU-06.4, HU-07.4, HU-07.5 | 3 | El consultor avisa; sale el correo; clasificación probada de punta a punta |
| 10 | H-4 | 1 | Desplegado, con sus tres comprobaciones |

**Suma:** 2 + 1 + 1 + 2 + 2 + 3 + 3 + 3 + 2 + 3 + 1 = 23.

## 5. Cuánto trabajo es

Con la escala del README (S ≈ 2 horas, M ≈ 4 horas): 5 × 2 + 18 × 4 = **82 horas de construir**.
No incluye la ronda de revisión de cada tramo, ni corregir lo que salga, ni actualizar el README
y `prompts.md`. La escala ya se quedó corta una vez. La Dirección asumió ese riesgo (D-73).

## 6. Cómo se revisa (dispensa D-74)

Una ronda del revisor adversarial al cerrar cada tramo, no una por ticket. Cada observación se
cierra —corregida, aceptada como riesgo o descartada— antes de abrir el tramo siguiente. Rige del
18/11/2026 al 09/12/2026.

## 7. Calendario

Meta interna: sábado 05/12/2026 (D-75). El día a día está en `../Seguimiento-diario.md`.
