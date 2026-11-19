> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras

## Herramientas, modelos y contexto utilizados

- **Herramientas:** Claude Code (CLI/app de Anthropic) como asistente principal durante toda la Entrega 1, trabajando directamente sobre el repositorio clonado `AI4Devs-finalproject` (gestión de rama, lectura de plantillas y edición de `readme.md`/`prompts.md`).
- **Modelos:** Claude Sonnet 5.5 (razonamiento general + generación de documentación técnica: arquitectura, modelo de datos, API, historias de usuario y tickets a partir de la idea de negocio descrita en lenguaje natural).
- **Contexto avanzado:** `CLAUDE.md` de otro proyecto del mismo usuario (Ombe) fue visible como contexto de la sesión pero **no se usó como base** de este proyecto (se decidió explícitamente "proyecto nuevo desde cero"); no se usaron skills, subagentes ni system prompts adicionales para esta entrega — el flujo fue conversación directa con Claude Code más lectura de las plantillas oficiales (`readme.md`/`prompts.md` del fork) para respetar su estructura exacta.
- **Proceso seguido:** en lugar de pedir "genera el proyecto final" de forma abierta, el desarrollo se guió con preguntas de alcance encadenadas (idea → stack → ubicación del repo → integración de WhatsApp → vertical de negocio → datos de la ficha) antes de generar cualquier documento, para evitar que la IA asumiera decisiones de producto/arquitectura que le correspondían al autor.

### Uso de IA en el ciclo de vida del desarrollo

- **Análisis:** definición del problema, del público objetivo y de las 5 funcionalidades must-have / 2 should-have a partir de la idea en lenguaje natural (sección 1 y Prompt 1-2 de esa sección).
- **Diseño:** elección de stack, decisión de integración real de WhatsApp (vs. mock), diagrama de arquitectura, modelo de datos (ER) y especificación de la API (secciones 2, 3 y 4).
- **Pruebas:** plan de pruebas unitarias/integración/E2E ya definido en la sección 2.6, incluyendo la decisión de mockear el envío real de WhatsApp en los tests automatizados; se usará IA para generar los tests concretos en la Entrega Final.
- **Despliegue:** arquitectura de infraestructura y despliegue (Vercel + Postgres gestionado + Cron) documentada con IA en la sección 2.4, pendiente de ejecutar en una entrega posterior.
- **Implementación y mantenimiento** (planificado, no ejecutado en esta entrega): se usará Claude Code para generar el scaffold inicial (Entrega 2) y para iterar sobre bugs/nuevas funcionalidades en entregas posteriores, manteniendo siempre revisión humana de lo generado.

---

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

**Prompt 1:**

"vamos a hacer un sistemas para negocios que trabajen por cita, donde el cliente pueda reservar en horarios disponbles que habilita el dueño del negocio, similar a lo que ya hace calendly, con mensajes de whats app para confirmar cita 24 horas antes"

*Criterio humano:* este fue el único prompt de producto; a partir de él, Claude propuso preguntas de acotamiento (no asumió el alcance directamente).

**Prompt 2:**

Pregunta de Claude (AskUserQuestion) para acotar el dominio: *"¿Qué tipo de negocios por cita tienes en mente como caso de uso principal?"* → respuesta del usuario: **"Genérico (cualquier negocio por cita)"**, lo que fijó que el MVP no se especializa en un vertical (salón, clínica, etc.) sino que el propio negocio configura su catálogo.

**Prompt 3:**

Instrucción implícita de continuar: tras fijar alcance (5 funcionalidades must-have: disponibilidad, catálogo de servicios, reserva pública, recordatorio WhatsApp 24h, panel de agenda) y 2 should-have opcionales, se pidió a Claude redactar la sección 1 completa (objetivo, funcionalidades, instalación) siguiendo la plantilla oficial del repo `AI4Devs-finalproject`.

*Criterio humano:* se revisó que las 5 funcionalidades must-have fueran realmente el núcleo (reserva + recordatorio WhatsApp) y no se diluyeran con las should-have; estas últimas se marcaron explícitamente como no operativas/opcionales para no comprometer el alcance exigido.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**

Pregunta de Claude: *"¿Qué stack quieres usar para este nuevo proyecto de citas?"* con 3 opciones razonadas (Next.js+Node/Postgres, React+Express+Postgres, o reutilizar el stack Expo de Ombe) → respuesta del usuario: **"Next.js + Node/Postgres"**.

**Prompt 2:**

Pregunta de Claude: *"Para los mensajes de WhatsApp de confirmación 24h antes, ¿cómo lo manejamos en el MVP?"* (API real de prueba vs. simulado) → respuesta del usuario: **"Integración real con API de prueba"**, lo que fijó Twilio WhatsApp Sandbox como integración externa en el diagrama en vez de un mock.

**Prompt 3:**

A partir de ambas decisiones, se pidió a Claude generar el diagrama de arquitectura (mermaid) y la justificación de un monolito modular Next.js frente a microservicios, explicando beneficios (simplicidad, un solo despliegue) y el sacrificio aceptado (notificaciones y lógica de negocio comparten runtime).

*Criterio humano:* se verificó que el diagrama reflejara fielmente las dos decisiones tomadas (stack y WhatsApp real) y no introdujera componentes no acordados (p. ej. colas de mensajería, que serían sobre-ingeniería para este MVP).

### **2.2. Descripción de componentes principales:**

**Prompt 1:**

Mismo contexto que 2.1 (stack Next.js/Postgres/Twilio ya decidido); se solicitó a Claude detallar cada componente (frontend, API, auth, DB, job programado, integración WhatsApp) con su tecnología concreta.

**Prompt 2:**

**Prompt 3:**

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

Se pidió a Claude proponer la estructura de carpetas de un proyecto Next.js App Router que separe rutas/presentación (`/app`), lógica de negocio pura testeable (`/lib/services`) y modelo de datos (`/prisma`), coherente con el plan de tests de la sección 2.6.

**Prompt 2:**

**Prompt 3:**

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

Se pidió a Claude documentar un despliegue estándar para este stack (Vercel + Postgres gestionado + Vercel Cron) ya que el despliegue es opcional en las bases del proyecto; se marcó explícitamente como "previsto", no como algo ya realizado.

**Prompt 2:**

**Prompt 3:**

### **2.5. Seguridad**

**Prompt 1:**

Se pidió a Claude enumerar las prácticas de seguridad mínimas razonables para el alcance (hash de contraseñas, validación de entrada, aislamiento de datos por negocio, manejo de secretos de WhatsApp/DB), evitando prometer medidas no realistas para un MVP de curso (p. ej. no se incluyó 2FA ni WAF).

**Prompt 2:**

**Prompt 3:**

### **2.6. Tests**

**Prompt 1:**

Se pidió a Claude redactar el plan de pruebas (unitarias, integración, E2E) requerido por las bases del proyecto, dejando explícito que el envío real de WhatsApp se mockea en los tests para no depender de red/servicios externos, siguiendo la recomendación de la propia guía del proyecto final sobre componentes no deterministas.

**Prompt 2:**

**Prompt 3:**

---

### 3. Modelo de Datos

**Prompt 1:**

A partir de las 5 historias/funcionalidades must-have ya acordadas (disponibilidad, servicios, reserva, recordatorio, panel), se pidió a Claude derivar las entidades mínimas necesarias (`Business`, `Service`, `Availability`, `Appointment`) y su diagrama entidad-relación en mermaid, incluyendo claves primarias/foráneas y restricciones.

**Prompt 2:**

**Prompt 3:**

*Criterio humano:* se decidió manualmente **no** crear una entidad `Client` independiente (el cliente no se registra, solo deja nombre/teléfono en la cita) para mantener la reserva pública simple, ajustado a la historia de usuario 2.

---

### 4. Especificación de la API

**Prompt 1:**

Se pidió a Claude seleccionar y documentar en formato OpenAPI los 3 endpoints principales del flujo (crear disponibilidad, consultar huecos libres, crear una cita), con ejemplos de petición/respuesta, priorizando los que forman la ruta crítica de la reserva.

**Prompt 2:**

**Prompt 3:**

---

### 5. Historias de Usuario

**Prompt 1:**

Se pidió a Claude redactar en formato "Como/quiero/para" las 3 historias de usuario más representativas del MVP (configurar disponibilidad, reservar sin cuenta, recibir recordatorio de WhatsApp 24h antes), cada una con criterios de aceptación verificables.

**Prompt 2:**

**Prompt 3:**

---

### 6. Tickets de Trabajo

**Prompt 1:**

Se pidió a Claude generar un ticket de backend (cálculo de huecos disponibles), uno de frontend (página pública de reserva) y uno de base de datos (esquema Prisma + seed), cada uno con alcance, criterios de aceptación y estimación, siguiendo el requisito de la guía de "backend, frontend y base de datos".

**Prompt 2:**

**Prompt 3:**

---

### 7. Pull Requests

> No aplica todavía en la Entrega 1 (0% código, sin PRs). Se completará en la Entrega Final con los prompts usados para generar las PRs reales del desarrollo.

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**
