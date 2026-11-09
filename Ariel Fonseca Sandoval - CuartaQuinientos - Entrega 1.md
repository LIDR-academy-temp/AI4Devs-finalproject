```
A I 4 D E V S · L I D R · R E V I S I Ó N D E L A P R I M E R A E N T R E G A
```

# CuartaQuinientos — Portal de Administración Condominial 

CuartaQuinientos es un portal web de administración condominial con tickets, cuotas y pagos, notificaciones y un asistente de Telegram con IA. Hemos revisado la idea, el análisis y el diseño documentados en el repositorio. 

`A L U M N O R E P O S I T O R I O F E C H A D E R E V I S I Ó N` Ariel Fonseca Sandoval <u>afonsecanice/ProyectoFinalLIDR_AFS</u> 14 de octubre de 2026 

Hola, Ariel: CuartaQuinientos propone la primera plataforma digital de `LUZ AMARILLA AVANZAR AJUSTANDO` administración para tu propio fraccionamiento: tickets de mantenimiento, cuotas y pagos, notificaciones, dashboards y, como diferenciador, «C500 Asiste», un asistente de Telegram con IA. Me ha gustado de verdad que el problema es real y lo conoces desde dentro (WhatsApp, recibos en papel y hojas de cálculo). También que pasas todo por una especificación antes de programar, con poke-holes, decisiones razonadas y trazabilidad entre historias, datos, API y tickets. La documentación es de las más trabajadas que he revisado; mi única preocupación es el tamaño de lo que quieres construir. 

## `01` Cómo está tu documentación 

Todas las partes obligatorias están resueltas con contenido propio, sin textos guía de la plantilla. Lo que conviene mejorar no es el contenido sino su forma: tu `README.md` supera con mucho las cuatro mil líneas y mezcla el diseño con los registros de prompts, lo que lo hace difícil de leer para una persona y caro de dar como contexto a un agente de IA. 

### ✓ **Ficha del proyecto** 

```
COMPLETA
```

Nombre, proyecto, descripción breve con el problema real del fraccionamiento y repositorio privado con acceso para el equipo. 

|✓<br>**Objetivo del producto**<br>Explica qué se pierde hoy (fallas sin seguimiento, estado de cuenta no consultable) y qué<br>gana cada perfil con la plataforma.<br>`COMPLETA`|
|---|
|✓<br>**Funcionalidades principales**<br>Tabla por módulos con su esquema de datos y una descripción útil de cada uno, incluido lo<br>que hace el bot según el perfil.<br>`COMPLETA`|
|✓<br>**Diagrama de arquitectura**<br>Diagrama en Mermaid, justificación de GraphQL con REST, de Dapper con vistas y del bot<br>como cliente de la misma API, con trade-offs honestos.<br>`COMPLETA`|
|✓<br>**Componentes principales**<br>Cada pieza con su tecnología y responsabilidad: JWT, bot, notificador saliente,<br>almacenamiento de archivos, servicio de IA y BI.<br>`COMPLETA`|
|✓<br>**Modelo de datos**<br>Diagrama en Mermaid por dominios, con claves, y modelo de extensiones para el bot, la IA y<br>el BI.<br>`COMPLETA`|
|✓<br>**Entidades principales**<br>Descripción de entidades con la máquina de estados del ticket y una tabla que reconcilia el<br>esquema físico con el lógico.<br>`COMPLETA`|
|✓<br>**Especificación de la API**<br>Endpoints representativos de login, creación de ticket y dashboard en detalle, más un<br>inventario por dominio para el resto.<br>`COMPLETA`|
|✓<br>**Historias de usuario**<br>Catálogo amplio con prioridad, criterios y una definición de hecho por tipo de trabajo, y un<br>núcleo explícito de historias para la demo.<br>`COMPLETA`|
|✓<br>**Tickets de trabajo**<br>Reparto claro entre base de datos, backend y frontend, con dependencias, estimaciones y<br>criterios de aceptación verificables.<br>`COMPLETA`|



El enlace al proyecto desplegado, la demo con capturas, las instrucciones de instalación validadas, la estructura de ficheros, la infraestructura, la seguridad, los tests y las pull requests se completan en la entrega final, así que no cuentan en esta revisión. Tú ya has adelantado mucho de ello: instrucciones de instalación, estructura de 

ficheros, infraestructura propuesta, decisiones de seguridad registradas como ADR, una estrategia de tests y wireframes conceptuales en Mermaid. Eso suma a tu favor. 

Las historias y los tickets cuentan bien el flujo principal. Defines un núcleo explícito que va de iniciar sesión a crear una incidencia, asignarla y resolverla, consultar el estado de cuenta y registrar un pago, con criterios de aceptación y una definición de hecho por tipo de trabajo. Los tickets reparten con orden las capas de base de datos, backend y frontend, con dependencias y estimaciones, y el ticket de base de datos incluye criterios verificables y un caso negativo concreto. Se pueden llevar a código casi tal cual. 

## `02` El problema y el alcance del MVP 

```
P U N T O F U E R T E · C A S O D E U S O
```

El caso de uso es claro: el residente reporta incidencias y consulta sus cuotas, y la administración ve en tiempo real tickets, morosos y cobranza. Se entiende qué introduce cada perfil y qué recibe a cambio, y las historias del núcleo lo reflejan. 

```
M I X T O · A L C A N C E D E L M V P
```

Sí, y ahí es donde quiero ayudarte a asegurar la llegada. Tu visión a largo plazo es excelente y el roadmap por fases ya apunta en la dirección correcta, pero el diseño sigue abarcando quince módulos, muchos esquemas y tablas, un bot con búsqueda sobre el reglamento, BI y almacén. Te propondría declarar como compromiso para la entrega final solo la primera fase: acceso, tickets, cuotas y pagos, notificaciones y el dashboard, que ya calculas en unas ciento cuarenta horas con margen. El bot de Telegram lo dejaría como extra si sobra tiempo, y la IA con RAG, BI, almacén, juntas y visitas como segunda versión, ya bien documentadas. Así, con el tiempo que tienes, el flujo estrella funciona de punta a punta. 

## `03` La arquitectura 

```
P U N T O F U E R T E
```

Las piezas encajan: SPA en React y bot en Python como clientes del mismo API en ASP.NET, acceso a datos con Dapper y vistas sobre SQL Server, y archivos fuera de la base de datos. El modelo de datos, el inventario de endpoints y los tickets cuentan la misma historia, y la identidad siempre sale del JWT. 

```
M I X T O · A J U S T E S
```

Primero, ofrecer REST y GraphQL a la vez duplica el contrato que debes mantener; para el núcleo, elegiría uno (REST encaja bien con tu convención por dominio) y dejaría GraphQL para el dashboard si de verdad lo necesitas. Segundo, el esquema físico `SQL/cuartaquinientos_schema.sql` viene de un diseño previo con nombres y estructura distintos al modelo que describes, y lo reconcilias con tickets de renombres. Para la implementación sería más seguro generar solo las tablas del núcleo directamente desde tu modelo y evitar dos fuentes de verdad. Tercero, desplegar SQL Server como contenedor en Railway es posible pero delicado, y tú mismo lo marcas como asumido; conviene validarlo pronto con una prueba de despliegue. 

## `04` La IA en tu ciclo de desarrollo 

En el máster buscamos que la IA esté presente en al menos cuatro de las seis fases del desarrollo. CuartaQuinientos las supera con holgura: tienes un flujo completo de especificación primero con Claude Code y Cursor, y varios agentes configurados. 

### **Análisis** 

#### `CON IA` 

**Diseño** `CON IA` 

Prompts de descubrimiento de dominio, un backlog con criterios de aceptación y una revisión adversarial que produjo hallazgos reales, como no pedir la contraseña en el chat de Telegram. 

Arquitectura, modelo, contratos y tickets nacen de prompts con tus correcciones humanas visibles, como rechazar los procedimientos almacenados y las rutas con prefijo `/api` . 

### **Implementación** 

```
CON IA
```

`CLAUDE.md` , reglas de Cursor, subagentes por capa, comandos del ciclo (definir, diseñar, ejecutar, revisar) y un ticket por rama con spec y diseño por adelantado. 

### **Pruebas** 

```
CON IA
```

Tienes un subagente de TDD, agentes de pruebas por capa y un hook que exige tests en verde con caso negativo; falta ver esa maquinaria funcionando sobre código real. 

### **Despliegue** 

#### `PREVISTA` 

El ticket de scaffolds incluye la integración continua y has razonado el despliegue; pide a la IA que genere y revise esos pipelines. 

### **Mantenimiento** 

```
CON IA
```

Tu herramienta para detectar divergencias entre el contrato de la API y el código y el subagente de mejora del propio flujo son justo documentación viva y trazabilidad. 

Lo que más rentabilidad te dará ahora es demostrar estas fases con código: pruebas generadas y revisión de cada PR contra el contrato, y una primera puesta en producción asistida para cerrar el círculo del despliegue. 

> `05` Próximos pasos 

1. **Congela el alcance en la primera fase** — escribe al inicio del README que el compromiso de entrega final es acceso, tickets, cuotas y pagos, notificaciones y dashboard, y marca el bot, la IA, el BI y el resto como segunda versión. Te protege de la tentación de abrir frentes nuevos y le da a tu agente un límite claro. 

2. **Divide el README y simplifica el contrato** — deja `README.md` como índice con la plantilla resumida y mueve el detalle de diseño y los registros de prompts a `docs/` . Elige un solo estilo de API para el núcleo y genera el esquema solo de las tablas que necesitas. 

3. **Prueba pronto el camino hasta producción** — como reto opcional, arranca con un despliegue mínimo (API, base de datos y SPA) antes de construir funcionalidades, para descubrir cuanto antes los límites de SQL Server en Railway. 

Tienes una base de análisis y diseño que pocos alcanzan; ahora la clave es elegir bien qué construir primero. Mucho ánimo con la implementación. 

- _El equipo de LIDR_ 

