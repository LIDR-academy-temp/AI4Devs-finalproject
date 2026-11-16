# Prompts

Prompts principales utilizados con el asistente de código (Claude Code) durante la creación del proyecto de contabilidad, agrupados por sección de la documentación.

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
   - [2.1. Diagrama de arquitectura](#21-diagrama-de-arquitectura)
   - [2.2. Descripción de componentes principales](#22-descripción-de-componentes-principales)
   - [2.3. Descripción de alto nivel del proyecto y estructura de ficheros](#23-descripción-de-alto-nivel-del-proyecto-y-estructura-de-ficheros)
   - [2.4. Infraestructura y despliegue](#24-infraestructura-y-despliegue)
   - [2.5. Seguridad](#25-seguridad)
   - [2.6. Tests](#26-tests)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 1. Descripción general del producto

**Prompt 1:**

```text
Quiero una aplicación web privada para autónomos y sus gestores contables. Hoy llevo las facturas en carpetas y
una hoja de cálculo, y cada trimestre rehago a mano el 130 y el 303. Antes de escribir código, ayúdame a definir
el producto: a quién va dirigido, qué problemas resuelve, funcionalidades del MVP y qué queda fuera. Pregúntame
lo que te falte.
```

**Prompt 2:**

```text
Redacta la sección «Descripción general» del README a partir de lo que hemos hablado: objetivo, usuarios
(cliente, contable, administrador), funcionalidades principales y flujo de uso de un cliente. Tono claro y sin
marketing; que lo entienda alguien que no conozca el proyecto.
```

**Prompt 3:**

```text
Revisa el README completo y dime qué le falta a un revisor externo para entender el producto en cinco minutos.
Propón el recorrido de pantallas (login, listado de facturas, nueva factura con IA, comentarios, modelos
fiscales) para la sección de diseño y experiencia de usuario, con una tabla paso / qué ocurre / imagen.
```

---

## 2. Arquitectura del sistema

### 2.1. Diagrama de arquitectura

**Prompt 1:**

```text
Genera un diagrama de arquitectura en Mermaid de accounting/: navegador, proceso Node con Express 5 y Angular SSR,
módulos del servidor (auth, db, storage, dominio, logging), MySQL 8.4, disco para los adjuntos y la API de Claude.
Dibuja también la SPA del navegador con sus páginas, servicios y utilidades fiscales.
```

**Prompt 2:**

```text
¿Qué patrón arquitectónico sigue el diagrama? Dime si es un monolito de tres capas y justifícalo. Haz una tabla de
beneficios y sacrificios de esta arquitectura (despliegue único, escalado limitado, rate limit en memoria,
adjuntos en disco local, migraciones manuales).
```

**Prompt 3:**

```text
Revisa el diagrama contra el código y dime qué falta o sobra: rutas protegidas, flujo de extracción con IA y
dónde vive el cálculo fiscal (cliente, funciones puras). Corrige solo lo que no coincida con lo que existe.
```

### 2.2. Descripción de componentes principales

**Prompt 1:**

```text
Describe los componentes principales de accounting/: frontend Angular, servidor Express, seguridad, acceso a datos
(el repositorio de MySQL), almacenamiento de adjuntos, IA, cálculo fiscal y logging. Hazlo como tabla
componente / tecnología / función. Léete el código y el package.json, no inventes versiones.
```

**Prompt 2:**

```text
Explica cómo está separada la lógica fiscal de Angular: vat303, irpf130, intra349 y vat390 como funciones puras
que reciben facturas y devuelven casillas. Quiero una tabla con modelo, entrada, salida y fichero de tests.
```

**Prompt 3:**

```text
Añade a la tabla de componentes las filas de documentos (pdfjs-dist y generadores propios de PDF, XLSX y ZIP en el
cliente) y de logging (pino con buffer circular consultable por el administrador). Comprueba en el código que
cada tecnología que nombras está de verdad en las dependencias.
```

### 2.3. Descripción de alto nivel del proyecto y estructura de ficheros

**Prompt 1:**

```text
Separa la contabilidad del portfolio en su propia aplicación dentro de un monorepo. El portfolio es público, sin
BD y va a Vercel; la contabilidad lleva MySQL y va a un VPS. Haz un plan de migración paso a paso antes de mover
nada y dime qué riesgos ves (rutas, variables de entorno, secretos compartidos).
```

**Prompt 2:**

```text
Genera el árbol de ficheros de accounting/ con una línea por carpeta relevante (db/, public/i18n, src/app con
pages, components, services, guards, directives y utils, src/auth, src/db, src/storage, src/accounting y
server.ts). Que sea el que existe de verdad: lístalo con Glob y resúmelo, no lo reconstruyas de memoria.
```

**Prompt 3:**

```text
Comprueba que portfolio/ no importa nada de accounting/ y que cada app tiene su propio package.json, JWT_SECRET
y puerto de desarrollo (4200 y 4300). Si encuentras acoplamientos, lístalos con fichero y línea, sin corregirlos
todavía. Después explica el patrón de organización por capas y por qué access.ts recibe si el contable supervisa
en lugar de consultar la BD.
```

### 2.4. Infraestructura y despliegue

**Prompt 1:**

```text
Explícame cómo desplegar accounting/ en un VPS con un proceso manual: build de Angular SSR, copia al servidor,
MySQL 8.4, variables de entorno y proxy inverso de un subdominio. Quiero una guía ordenada con comprobaciones tras
cada paso y un diagrama Mermaid del despliegue.
```

**Prompt 2:**

```text
El SSR rechaza las peticiones en producción y npm install falla con argon2 al copiar el build. Averigua por qué y
documenta qué hay que configurar: security.allowedHosts en angular.json y que @node-rs/argon2, al ser nativa, se
instale en el propio VPS (externalDependencies).
```

**Prompt 3:**

```text
Documenta el orden seguro de despliegue cuando hay migraciones de BD: qué se ejecuta antes de arrancar la nueva
versión, cómo comprobarlo y cómo revertir. Pon como ejemplo la migración que amplía la columna PASSWORD.
```

### 2.5. Seguridad

**Prompt 1:**

```text
Las contraseñas están con SHA-256 sin sal. Cámbialas a argon2id sin forzar un restablecimiento: las cuentas
antiguas deben seguir entrando y reescribirse al siguiente login correcto. Cuida las carreras al actualizar y que
el tiempo de respuesta no revele si el usuario existe.
```

**Prompt 2:**

```text
Haz una revisión de seguridad del endpoint de lectura de facturas con IA: el archivo subido no es de fiar
(inyección de instrucciones), validación del tipo por contenido y no por extensión, límites de tamaño, y que un
fallo de la API no filtre mensajes internos. Dime qué falta y arréglalo.
```

**Prompt 3:**

```text
Revisa los permisos: un CUSTOMER solo ve sus facturas, un ACCOUNTANT las de sus clientes supervisados y el ADMIN
todas. Busca endpoints que consulten por ID sin comprobar propietario, también los de documentos y comentarios,
y añade tests de acceso denegado. Si no hay permiso sobre una factura, la respuesta debe ser 404 y no 403, para no
revelar que existe.
```

### 2.6. Tests

**Prompt 1:**

```text
Escribe los tests unitarios de irpf130.ts: pago fraccionado acumulado desde enero, gastos y activos con
amortización. Usa importes que se puedan calcular a mano y que no sean datos reales.
```

**Prompt 2:**

```text
Cubre tax-validate.ts: identidad del documento (modelo, año, trimestre), casilla distinta, tolerancia de un
céntimo, casillas de entrada manual y lectura incoherente. Cada caso con un ReadTaxModel construido a mano, sin
PDF reales.
```

**Prompt 3:**

```text
Añade tests de componente para AccountingComponent: el aviso en amarillo cuando base o IVA no cuadran con el
total, el caso de una factura internacional (base = total, IVA al 21 %) y que no salte el aviso de «total ≠ base
+ IVA» en ese caso.
```

---

## 3. Modelo de datos

**Prompt 1:**

```text
Diseña el esquema MySQL 8.4 para user (con PROFILE y STATUS como enums), relationship (quién supervisa a quién),
invoice y comment. Con claves, tipos exactos (importes en DECIMAL(12,2), no FLOAT), año y trimestre como columnas
generadas, FKs con RESTRICT, columnas de auditoría e índices para los filtros más habituales. Dame el DDL y un
diagrama ER en Mermaid.
```

**Prompt 2:**

```text
Una factura puede ser intracomunitaria, y entonces de bienes o de servicios. Escribe la migración que renombra
INTERNATION a INTRA_COMMUNITY y añade INTRA_TYPE (GOOD o SERVICE, NULL si no es intracomunitaria), con
compatibilidad para las filas existentes.
```

**Prompt 3:**

```text
Necesito saber qué comentarios ha leído cada usuario. Compara una fila por comentario y usuario frente a una fila
por factura y usuario con LAST_SEEN_COMMENT_ID, razona el crecimiento de cada opción y escribe la migración de la
elegida con backfill idempotente y reversión.
```

---

## 4. Especificación de la API

**Prompt 1:**

```text
Lee src/server.ts y elige tres endpoints representativos de accounting/ (login, crear factura y lectura con IA).
Para cada uno: método, ruta, autenticación requerida, cuerpo, respuestas y códigos de error. Si hay algo ambiguo
en el código, márcalo en lugar de suponer.
```

**Prompt 2:**

```text
Crea POST /api/accounting/invoices/extract: recibe un archivo, lo lee con Claude y devuelve los campos para el
prefill sin guardar nada. Valida con authenticate() primero, tamaño, tipo por contenido y clave de API; sanea la
salida del modelo; 502 genérico si falla la API. Escribe también el contrato de respuesta.
```

**Prompt 3:**

```text
Escribe la especificación OpenAPI 3.0 de esos tres endpoints, con esquemas reutilizables para InvoiceInput y para
los errores, esquema de seguridad bearer y ejemplos de petición y respuesta. Debe validar con un linter de
OpenAPI.
```

---

## 5. Historias de usuario

**Prompt 1:**

```text
Redacta la historia de usuario de subir una factura y que se rellene sola, con el formato «Como… quiero…
para…», ID, épica, prioridad MoSCoW, estimación en puntos y criterios de aceptación en Dado/Cuando/Entonces:
factura legible, concepto deducido, datos ilegibles, archivo no permitido y servicio de IA caído. Indica qué queda
fuera de alcance.
```

**Prompt 2:**

```text
Escribe la historia del modelo 303: un autónomo quiere saber cuánto ingresar cada trimestre sin hojas de cálculo.
Incluye escenarios de cálculo trimestral, resultado a devolver, intracomunitaria, trimestre vacío y descarga del
PDF, y las notas de qué parte es lógica pura con tests.
```

**Prompt 3:**

```text
Escribe la historia de colaboración: un contable comenta una factura de su cliente (hasta 2000 caracteres), el
cliente ve el aviso de no leídos, la lectura es individual por usuario y un contable que no supervisa al cliente
recibe 404. Marca las dependencias con las otras historias.
```