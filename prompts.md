# Prompts — Concilia

> Registro de los prompts principales utilizados durante la creación del proyecto, como evidencia del uso de asistentes de IA en todas las fases del ciclo de vida del desarrollo.

**Herramientas utilizadas**

| Fase                             | Herramienta        | Modelo              |
| -------------------------------- | ------------------ | ------------------- |
| Ideación y documentación técnica | Claude (claude.ai) | Claude Opus 5.5     |
| Desarrollo backend y frontend    | Claude Code        | Sonnet, Opus, Fable |
| Testing                          | Claude Code        | Sonnet              |
| Despliegue y CI/CD               | Claude Code        | Sonnet              |
| IA integrada en el producto      | Por definir        | Por definir         |

**Conversación completa de la fase de documentación:** _[enlace compartido de claude.ai]_

> **Leyenda:** ⏳ indica un prompt previsto para una fase posterior o pendiente de ejecución; se actualizará con el resultado real y los ajustes humanos realizados.

## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 1. Descripción general del producto

**Prompt 1:** _Definición del problema y del producto_

```
Quiero diseñar y desarrollar un producto de software llamado **“Concilia”**, orientado a automatizar y facilitar la conciliación de transacciones realizadas mediante tarjetas de crédito y débito en cadenas comerciales.

### 1. Problema que queremos resolver

Las cadenas comerciales reciben diariamente un gran volumen de pagos realizados por sus clientes mediante tarjetas de crédito y débito.

Estas transacciones quedan registradas inicialmente en el sistema de **Punto de Venta (POS)** de la cadena comercial. Posteriormente, el banco, adquirente o procesador de pagos proporciona información sobre las transacciones procesadas y liquidadas, normalmente mediante archivos como Excel, CSV u otros formatos.

Actualmente, muchas empresas realizan la conciliación entre ambas fuentes de información de forma manual, utilizando Excel. Una persona debe comparar las transacciones registradas en el POS contra las transacciones reportadas por el banco, identificar coincidencias, detectar diferencias y analizar las transacciones que no pudieron ser conciliadas.

Este proceso consume una cantidad importante de tiempo, es susceptible a errores humanos y se vuelve especialmente complejo cuando existen miles o millones de transacciones.

### 2. Objetivo de Concilia

El objetivo de **Concilia** es automatizar este proceso.

La herramienta debe permitir que el usuario cargue diferentes fuentes de información, principalmente:

- Archivos exportados desde el sistema POS.
    
- Archivos proporcionados por el banco, adquirente o procesador de pagos.
    
- Eventualmente otras fuentes relacionadas con las transacciones.
    

El sistema debe analizar, normalizar y comparar la información de las diferentes fuentes para determinar qué transacciones corresponden entre sí.

El objetivo es conseguir un **alto porcentaje de conciliación automática**, reduciendo significativamente la cantidad de transacciones que requieren revisión manual.

### 3. Proceso esperado

El flujo principal debería ser aproximadamente el siguiente:

1. El usuario crea o selecciona un proceso de conciliación.
    
2. Carga el archivo de transacciones provenientes del POS.
    
3. Carga el archivo correspondiente al banco, adquirente o procesador de pagos.
    
4. El sistema analiza la estructura de los archivos y permite configurar o identificar los campos relevantes.
    
5. El sistema normaliza los datos para que puedan ser comparados aunque provengan de estructuras diferentes.
    
6. Se ejecutan diferentes reglas y estrategias de conciliación.
    
7. Las transacciones que presentan una coincidencia clara se marcan como **conciliadas automáticamente**.
    
8. Las transacciones que presentan diferencias o coincidencias ambiguas se clasifican para **revisión manual**.
    
9. Las transacciones que no tienen correspondencia en la otra fuente se identifican como **no conciliadas**.
    
10. El sistema genera reportes y métricas sobre el resultado del proceso.
    

### 4. Posibles criterios de conciliación

El sistema no debería depender necesariamente de un único campo para realizar el cruce.

Debe analizar diferentes atributos de una transacción, por ejemplo:

- Número de autorización.
    
- Número de referencia.
    
- Número de lote.
    
- Fecha y hora.
    
- Monto.
    
- Número de tarjeta enmascarado.
    
- Terminal.
    
- Comercio.
    
- Código de transacción.
    
- Código de autorización.
    
- Tipo de tarjeta.
    
- Adquirente o procesador.
    
- Cualquier otro identificador disponible.
    

Las reglas deberían poder combinar varios campos y manejar diferencias habituales entre las fuentes, como:

- Diferencias de formato de fecha.
    
- Diferencias de formato de hora.
    
- Diferencias en separadores decimales.
    
- Redondeos.
    
- Campos con espacios adicionales.
    
- Mayúsculas/minúsculas.
    
- Diferentes formatos de identificadores.
    
- Transacciones agrupadas o divididas.
    
- Diferencias entre la fecha de la venta y la fecha de liquidación.
    

### 5. Conciliación inteligente

Quiero evaluar también la posibilidad de incorporar mecanismos de **matching inteligente o fuzzy matching**.

Por ejemplo, cuando una transacción no coincide exactamente, el sistema podría calcular un nivel de confianza utilizando diferentes atributos y determinar si existe una coincidencia probable.

Cada resultado podría tener una clasificación como:

- Conciliación exacta.
    
- Conciliación automática con alta confianza.
    
- Coincidencia probable — requiere revisión.
    
- No conciliada.
    
- Transacción duplicada.
    
- Transacción presente en POS pero ausente en banco.
    
- Transacción presente en banco pero ausente en POS.
    
- Diferencia de monto.
    
- Diferencia de fecha.
    
- Diferencia de otros atributos.
    

La herramienta debe mantener trazabilidad de por qué dos transacciones fueron consideradas coincidentes.

### 6. Intervención humana

El objetivo no es necesariamente eliminar completamente la intervención humana.

La intención es que **Concilia automatice la mayor cantidad posible del trabajo y concentre la atención de la persona únicamente en las excepciones**.

El usuario debería poder revisar las transacciones no conciliadas, visualizar la información de ambas fuentes lado a lado, entender por qué el sistema no pudo conciliarlas y, cuando corresponda, confirmar o corregir manualmente una conciliación.

Estas decisiones podrían posteriormente utilizarse para mejorar las reglas de conciliación.

### 7. Resultados y métricas

El sistema debería mostrar métricas como:

- Total de transacciones recibidas.
    
- Total de transacciones conciliadas automáticamente.
    
- Porcentaje de conciliación automática.
    
- Total de transacciones pendientes de revisión.
    
- Total de transacciones no conciliadas.
    
- Diferencias de monto.
    
- Transacciones duplicadas.
    
- Diferencias por fecha.
    
- Diferencias por comercio, terminal, banco o procesador.
    
- Valor monetario total conciliado.
    
- Valor monetario total pendiente o no conciliado.
    

También debería permitir exportar los resultados a Excel, CSV u otros formatos.

### 8. Escalabilidad

Aunque inicialmente podría utilizarse con archivos Excel o CSV, quiero que el diseño contemple que en el futuro Concilia pueda procesar grandes volúmenes de información y conectarse directamente mediante APIs, bases de datos, SFTP u otros mecanismos con:

- Sistemas POS.
    
- Bancos.
    
- Adquirentes.
    
- Procesadores de pagos.
    
- ERP.
    
- Sistemas contables.
    

### 9. Objetivo del producto

Quiero que me ayudes a convertir esta idea en una definición de producto de software concreta.

Analiza el problema desde el punto de vista funcional y técnico y propón:

1. El alcance del **MVP**.
    
2. Los principales tipos de usuarios.
    
3. Los casos de uso principales.
    
4. El flujo completo de conciliación.
    
5. La arquitectura funcional del sistema.
    
6. El modelo de datos inicial.
    
7. Las reglas y estrategias de matching.
    
8. Cómo debería funcionar la conciliación con múltiples niveles de confianza.
    
9. Cómo manejar excepciones y correcciones manuales.
    
10. Los reportes y dashboards necesarios.
    
11. La estrategia para procesar grandes volúmenes de transacciones.
    
12. Qué partes podrían utilizar IA y cuáles deberían resolverse mediante reglas determinísticas.
    
13. Cómo debería aprender el sistema de las conciliaciones realizadas manualmente.
    
14. Las principales consideraciones de seguridad y auditoría.
    
15. Una propuesta de arquitectura tecnológica.
    
16. Una propuesta de roadmap desde MVP hasta una versión empresarial.
    

No quiero que asumas que todas las transacciones pueden conciliarse mediante una coincidencia exacta. Quiero que analices diferentes escenarios reales de conciliación y propongas una estrategia robusta que combine **reglas determinísticas, matching probabilístico y, cuando tenga sentido, inteligencia artificial**.

El objetivo final es construir un producto que reduzca de forma significativa el trabajo manual de los equipos financieros y de tesorería, manteniendo trazabilidad, explicabilidad y control sobre cada conciliación.
```

_Resultado:_ propuesta de MVP, flujo principal del usuario y diseño del motor de conciliación por niveles (exacto, tolerancia, agrupado y asistido por IA). El asistente planteó preguntas de clarificación sobre stack, forma de acreditación bancaria y formato de entrega.

**Prompt 2:** _Decisiones de alcance y generación de la documentación_

```
Stack: Node.js (NestJS/Express) + React.
¿Cómo llegan los depósitos al banco?: No estoy seguro.
```

_Resultado:_ primera versión completa del `README.md`, incluyendo funcionalidades, alcance del MVP y lo que queda fuera de alcance.

**Prompt 3:** _Revisión crítica del alcance_

```
Actúa como product manager con experiencia en productos fintech B2B. Revisa la sección
"Descripción general del producto" del README de Concilia y señala: (1) funcionalidades
que no aportan al flujo principal y podrían salir del MVP, (2) riesgos de producto que no
estoy considerando, y (3) métricas concretas para medir el éxito. No reescribas el
documento; dame una lista priorizada de cambios.
```

_Resultado:_ 
### 1. Funcionalidades que podrían salir del MVP

1. **Plantillas de importación reutilizables (HU-12).** Aportan en el uso recurrente mes a mes, pero no al flujo principal de una conciliación. Ya está como _Could_; te sugiero declararla explícitamente fuera del MVP.
2. **Roles diferenciados (ADMIN / ANALYST).** Para validar el producto basta un único rol. Mantén el campo `role` en el modelo, pero no construyas UI ni permisos diferenciados hasta después.
3. **Gestión multiempresa visible.** Conserva `companyId` para el aislamiento de datos, pero deja claro que en el MVP no hay pantalla de alta de empresas; se crean por seed.
4. **Auditoría como módulo completo (TK-24).** Los campos `createdById` y `confirmedById` en `Match` ya cubren la trazabilidad mínima. El log de auditoría separado puede esperar.
5. **Filtros avanzados en el panel.** Con filtrar por estado y buscar por monto es suficiente al inicio.
### 2. Riesgos de producto no considerados

1. **Los falsos positivos son peores que los falsos negativos.** Este es el riesgo más serio. Un cruce que no se hizo, el analista lo resuelve; un cruce equivocado confirmado automáticamente pasa desapercibido y erosiona la confianza en la herramienta. Hoy el nivel 2 se auto-confirma "si es único", pero en retail hay montos muy repetidos ($5, $10, $20). Recomiendo que el documento declare explícitamente que se prioriza precisión sobre cobertura, y que el nivel 2 genere propuestas en lugar de cruces confirmados cuando no hay código de autorización.
2. **El objetivo de 90 % no está respaldado por datos.** No sabes aún cómo acredita el banco, así que la cifra es una suposición. Consigue al menos un archivo real anonimizado de cada lado antes de la entrega 2, aunque sea de unos pocos días.
3. **Transacciones que cruzan períodos.** Una venta del 30 de septiembre acreditada el 2 de octubre quedará como pendiente en ambas conciliaciones. El modelo actual trata cada conciliación como aislada; falta al menos reconocer el caso en el documento y definir qué pasa con los pendientes arrastrados.
4. **Comisiones distintas según marca y adquirente.** Un único `feePercent` por conciliación no refleja la realidad: Visa, Mastercard y Diners suelen tener tarifas diferentes, y una cadena puede trabajar con más de un adquirente. También conviene verificar si las ventas diferidas se liquidan con condiciones distintas a las corrientes.
5. **Múltiples locales y códigos de comercio.** Una cadena tiene varios establecimientos y el banco suele depositar por código de comercio. El campo `storeCode` existe en el modelo, pero no se menciona como criterio de agrupación en el motor.
6. **Devoluciones, anulaciones y contracargos.** Aparecen como motivos de excepción, pero no como tipos de transacción que el motor deba reconocer (por ejemplo, una venta y su anulación en el POS que se netean entre sí).
7. **Confianza del cliente sobre sus datos.** Un jefe financiero puede resistirse a subir extractos bancarios a la nube y más aún a que se envíen a un LLM externo. Menciona en la propuesta de valor que la IA es opcional y qué datos exactos se le envían.
8. **Formato PDF de los extractos.** Está fuera de alcance, lo cual es correcto, pero si el banco del cliente solo entrega PDF, el producto no sirve. Es un supuesto que conviene dejar escrito.
### 3. Métricas de éxito

**Medibles en el proyecto (con el `expected.json` del ticket TK-03):**

1. **Precisión de cruces automáticos:** porcentaje de cruces automáticos que son correctos según el resultado esperado. Objetivo ≥ 99 %. Es la métrica principal.
2. **Tasa de conciliación automática:** porcentaje de transacciones cruzadas sin intervención humana. Objetivo ≥ 90 % en el dataset estándar, reportado por separado para cada escenario (exacto, desfase, lote, neto).
3. **Tasa de aceptación de sugerencias de IA:** porcentaje de propuestas del nivel 4 que resultan correctas. Objetivo inicial ≥ 60 %.
4. **Rendimiento:** tiempo de ejecución del motor para 10.000 × 10.000 registros (ya está en TK-12).

**Medibles con uso real:**

5. **Tiempo de cierre de un período,** comparado con el proceso manual actual. Para esto necesitas una línea base: pregúntale a quien hace hoy la conciliación cuántas horas le toma. Es un dato muy potente para tu presentación final.
6. **Tasa de cruces deshechos por el usuario:** mide la confianza real en el motor.
7. **Tasa de filas rechazadas en la importación:** objetivo < 1 %; si es alta, el problema está en el mapeo o la normalización.
8. **Monto pendiente sin explicar al cierre:** el indicador que le importa al jefe financiero.

---

**Prompt 4:** _Documento de requisitos del producto (PRD)_ — Claude Code, modelo Fable 5.1

```
revisa el problema definido en el archivo readme.md, y ayúdame a generar un documento de
requisitos del producto (PRD)
```

_Resultado:_ `docs/PRD.md` con resumen ejecutivo, objetivos y no-objetivos, personas, casos de uso, 41 requisitos funcionales (RF-01..RF-41) trazados a las HU, reglas de negocio del motor, 16 requisitos no funcionales, uso de IA, métricas de éxito, riesgos, plan de entregas y seis decisiones abiertas. Incorpora la revisión crítica del Prompt 3 (precisión antes que cobertura, nivel 2 como propuesta sin últimos 4 dígitos).

---


## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1_, donde se fijó el stack Node.js + React. El asistente propuso un monolito modular NestJS con SPA React, PostgreSQL y Claude API, justificando beneficios y sacrificios frente a microservicios.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

### **2.2. Descripción de componentes principales:**

**Prompt 1:** _Diseño del motor de conciliación (derivado del Prompt 1 de la sección 1)._ El asistente propuso el patrón Strategy dentro de un pipeline, con el motor aislado del framework para facilitar el testing, y la fórmula de monto neto esperado para depósitos con comisión y retención.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1._ El asistente propuso un monorepo con workspaces de npm (`apps/api`, `apps/web`, `e2e`, `samples`) y la estructura modular de NestJS por contexto funcional.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

### **2.4. Infraestructura y despliegue**

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1._ Propuesta de despliegue con GitHub Actions, backend y base de datos en Render/Railway y frontend en Vercel.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

### **2.5. Seguridad**

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1._ El asistente incorporó por iniciativa propia el enmascaramiento de tarjetas (solo últimos 4 dígitos, alineado con PCI DSS), el aislamiento multiempresa y la restricción de datos enviados al LLM.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

### **2.6. Tests**

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1._ Estrategia con Jest (unitarios), Supertest con PostgreSQL de test (integración) y Playwright (E2E), más la idea de datasets sintéticos para medir el porcentaje de cruce del motor.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

---

### 3. Modelo de Datos

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1._ Ante la respuesta "no estoy seguro" sobre la forma de acreditación, el asistente diseñó un modelo que soporta depósitos uno a uno, por lote y netos (campos opcionales `grossAmount`, `feeAmount`, `withholdingAmount`) y una tabla `MATCH_ITEM` para cruces 1:1, N:1 y N:M.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

---

### 4. Especificación de la API

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1._ Listado de endpoints REST y especificación OpenAPI de los tres endpoints principales (carga de archivos, ejecución del motor y cruce manual).

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

---

### 5. Historias de Usuario

**Prompt 1:** _Generado a partir del Prompt 2 de la sección 1._ Doce historias con formato "Como / quiero / para", criterios de aceptación en formato Dado / Cuando / Entonces, priorización MoSCoW y asignación a entregas.

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas

---

### 6. Tickets de Trabajo

**Prompt 1:** _Adopción de OpenSpec para ejecutar el backlog_ — Claude Code, modelo Fable 5.1

```
Quiero usar OpenSpec para ir desarrollando el proyecto, ayudame a generar los documentos
necesarios para poder utilizar el framework que quiero usar, se me ocurre que de pronto
historias de usuario y tickets ?
```

_Resultado:_ el asistente investigó la estructura de OpenSpec 1.14 (config.yaml, changes con proposal/specs/design/tasks, comandos `/opsx:*`), planteó cuatro decisiones (granularidad por bloque funcional, E2 completo y E3 solo propuestas, español con palabras clave en inglés, actualizar el CLI) y generó `openspec/config.yaml` con el contexto y las reglas del proyecto, 6 changes de E2 completos (10 specs con escenarios derivados de los criterios de aceptación de las HU y tasks derivadas de los tickets TK-01..TK-17) y 7 propuestas de E3. Validado con `openspec validate --strict`. Ajuste humano: ninguno todavía.

**Prompt 2:** _Implementación del primer change con OpenSpec_ — Claude Code, modelo Fable 5.1

```
/opsx:apply setup-project-foundation
```

_Resultado:_ monorepo npm con `apps/api` (NestJS 12 en ESM, validación de entorno con Zod 4, Prisma 7 con driver adapter, Swagger, endpoint de salud), `apps/web` (React 18 + Vite + Tailwind 4 + TanStack Query), `samples` (generador de datasets sintéticos con `expected.json`), Docker Compose con PostgreSQL 16 y base de test, esquema Prisma de las diez entidades con restricciones CHECK añadidas a mano, seed idempotente, ESLint/Prettier compartidos, 6 tests unitarios de entorno, 8 de integración de base de datos y 22 del generador (Vitest). Ajuste humano: la primera versión usó NestJS 10 y Prisma 6 según el readme, lo que arrastraba 14 vulnerabilidades altas de `npm audit`; se decidió subir a NestJS 12, Prisma 7, TypeScript 6 y Vite 8 antes del primer commit, dejando una sola vulnerabilidad conocida (`xlsx`, sin parche en npm).

**Prompt 3:** _Reglas de cruce con datos reales e implementación de autenticación_ — Claude Code, modelo Sonnet 5.5

```
En la carpeta docs/archivos_ejemplo coloqué 2 archivos ejemplo para realizar pruebas, Intranet_ejemplo.xlsx y Liquidaciones_Diners_ejemplo.xlsx, el primero viene de los datos del POS y el segundo viene del extracto del banco [...] cuentame con que change debemos continuar

el cruce debería ser por local, lote y referencia, luego te compartiré una tabla de relación para poder cruzar los locales entre los 2 archivos. y si continua a aplicar auth-and-tenant-isolation
```

_Resultado:_ análisis de ambos Excel (el POS mezcla adquirentes y no trae autorización; el extracto Diners trae una fila por cuota con bruto y neto), notas en los `design.md` de `file-import-and-column-mapping` y `matching-engine-core` con la decisión de cruzar por local + lote + referencia mediante una tabla de relación de locales, e implementación de `auth-and-tenant-isolation` (JWT, guards globales, roles, rate limiting, Helmet, pantalla de login y tests unitarios, de integración y de componentes).

**Prompt 4:** _Commit y siguiente change con OpenSpec_ — Claude Code, modelo Sonnet 5.5

```
solo procede con el commit y sigue con el siguiente change reconciliation-management
```

_Resultado:_ commit de la base del proyecto y de `auth-and-tenant-isolation`, e implementación de `reconciliation-management`: módulo `reconciliations` en el API (creación, listado paginado con filtros por estado y solapamiento de período, detalle, parámetros con defaults y máquina de estados) y, en el frontend, layout autenticado, listado, paso 1 del asistente y detalle, con tests unitarios, de integración y de componentes.

---

### 7. Pull Requests

**Prompt 1:** Se profundizarán en siguiente entregas

**Prompt 2:** Se profundizarán en siguiente entregas

**Prompt 3:** Se profundizarán en siguiente entregas
