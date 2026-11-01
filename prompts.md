Los siguientes son prompts reales, copiados tal como se escribieron. Las respuestas se revisaron y las decisiones de producto y arquitectura las tomó el autor.

Las fases de implementación y pruebas todavía no comenzaron. Sus prompts se agregarán a medida que se usen, a partir de la Entrega 2.

## Índice

0. [Análisis previo: ingeniería inversa](#0-análisis-previo-ingeniería-inversa)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)

---

## 0. Análisis previo: ingeniería inversa

Herramientas: OpenSpec y Claude Opus 5.5 en modo de esfuerzo alto, sobre el código del prototipo.

**Prompt 1:**

```text
Vamos a documentar como spec de OpenSpec la capability que YA existe en este proyecto:
la de cuentas y acceso (registro, inicio de sesión, dashboard pantallas, botones, etc.). Esto es ingeniería
inversa: leer el código y escribir lo que hace HOY, no proponer nada nuevo ni cambiar
una línea.
1. Explora su UI, el modelo de negocio, sus capacidades, sus debilidades, sus rutas y sus middlewares. En
`frontend/`: las pantallas de acceso, el estado de sesión y la protección de rutas.
2. Escribe `openspec/specs/auth/spec.md` con el formato exacto de una spec VIVA de
OpenSpec: un `## Purpose` de una o dos frases, y debajo `## Requirements`, con `###
Requirement:` en los que el sistema SHALL hacer algo, y bajo cada uno al menos un `####
Scenario:` de cuatro almohadillas con sus dos viñetas `- **WHEN**` y `- **THEN**`. En
castellano, salvo las mayúsculas RFC-2119.
3. NO uses secciones ADDED, MODIFIED ni REMOVED: eso es de un delta, y esto no es un
delta, es la verdad actual del sistema.
4. Describe solo comportamiento observable desde fuera. Nada de nombres de clase ni de
rutas de archivo. Toma nota de lo que necesitaría ser el backend. Lo mismo para el
frontend, observable = lo que una persona ve y puede hacer en pantalla.
5. Al terminar, dime qué comportamiento del código NO has podido expresar como
requisito, y por qué. Validar
```

---

## 1. Descripción general del producto

Herramienta: Claude Code con Claude Opus 5.5.

**Prompt 1:**

```text
Necesito que revises esta carpeta de manera completa y detallada y te concentres en el documento README.md No hagas nada aún, quiero que me indiques qué entiendes una vez que lo leas y todas las dudas que te surjan me las enumeras. Luego de eso te iré guiando los pasos a seguir
```

**Prompt 2:**

```text
Te paso más datos para que revises y luego continuamos para ver si algunas se responden, se renuevan o surgen otras más:

1. En esta ubicación "C:\Users\Pablo\openspec-sandbox" hay un previo proceso de SDD con openspec
2. En esta otra ubicación "C:\Dev\SAT2Dashboard" está el repo desde donde se trabaja el diseño de la aplicación inicial.
3. Para que quede claro, el nombre real es Weather Track y el SAT2Dashboard es solo una referencia vieja debido a la documentación oficial de la empresa TECMES

Luego de esto, revisa tus comentarios anteriores, evaluaciones, preguntas, etc. y sigamos sin tocar nada hasta que quede claro todo lo que me planteaste junto con mis respuestas a tus preguntas
```

**Prompt 3:**

```text
1. De acuerdo siempre y cuando no quede confuso porque luego deberemos tomar una dirección limpia
2. Lo que hay funcional hoy es un recurso intermedio para probar lógica y UI. Luego vemos el planteo del trabajo para migrar, no pensemos en eso ahora solo apuntarlo y que quede además para seguir a futuro de manera profesional. Este repo es académico y el alcance es la entrega para recibir la certificación de la maestría en ingeniero IA. A futuro deberá migrar a un repo de producción empresarial y no se considera en este trabajo, solo se apunta para un futuro.
3. resuelta
4. Entrega 1 "HOY" (documentación, diseño e idea): no hay código que probar. Revisamos que lo obligatorio de la lista anterior esté completo (con tu propio contenido, no los textos guía de la plantilla) y valoramos:
   * Problema y caso de uso: qué resuelves, para quién, qué introduce el usuario y qué le devuelve el sistema.
   * MVP viable: que el alcance se pueda construir en el curso, centrado en el flujo principal.
   * Coherencia técnica: que arquitectura, modelo de datos, API y tickets encajen entre sí.
   * IA en el ciclo de vida: que la uses (o planees usarla) en al menos 4 de las 6 fases del ciclo de vida del desarrollo de software: análisis, diseño, implementación, pruebas, despliegue y mantenimiento.

Hay dos entregas más que son la funcional "en 20 días" y la de la aplicación llave en mano, completamente documentada como para un cliente "principios de diciembre"
Esta aplicación nació de un proyecto laboral, luego creció para servicio profesional y ahora la integro a este curso como Tesis de graduación en la academia. 
En cuanto terminemos de trazar esta ruta de inicio de la primara entrega, lo hacemos y luego nos concentramos en la completa especificación para documentar, migrar y confeccionar la 2da entrega
```

---

## 2. Arquitectura del Sistema

Las secciones 2 a 7 del README se redactaron en una misma sesión de Claude Code. Partieron de los prompts de la sección 1 y de seis decisiones que el asistente propuso y el autor aprobó: caso de uso, alcance del MVP, arquitectura destino, agentes de IA, reglas del índice TIS e IA en el ciclo de vida. No hubo un prompt independiente por apartado, por lo que aquí se registra solo el prompt que inició el trabajo.

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**

```text
Apruebo las 6
```

**Prompt 2:**

```text
1. Lo obligatorio es todo lo que podamos tener al momento y restringido a lo que se pide en la entrega, el resto es nuestro. Podemos hacer un comentario en lo que se denomina TypeForm
2. Por el momento si podemos
3. correcto, más adelante podemos hacer un flujograma con esto pero por ahora dejémoslo aquí

Empecemos con el trabajo propuesto
```

### **2.2. Descripción de componentes principales:**

Se generó con los prompts de la sección 2.1.

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

Se generó con los prompts de la sección 2.1.

### **2.4. Infraestructura y despliegue**

Se generó con los prompts de la sección 2.1.

### **2.5. Seguridad**

Se generó con los prompts de la sección 2.1.

### **2.6. Tests**

Se generó con los prompts de la sección 2.1. Es un plan: los prompts de pruebas se registrarán en la Entrega 2.

---

## 3. Modelo de Datos

Se generó con los prompts de la sección 2.1.

---

## 4. Especificación de la API

Se generó con los prompts de la sección 2.1.

---

## 5. Historias de Usuario

Se generó con los prompts de la sección 2.1.

---

## 6. Tickets de Trabajo

Se generó con los prompts de la sección 2.1.

---

## 7. Pull Requests

Todavía no hay pull requests. Los prompts se agregarán cuando se abran.
