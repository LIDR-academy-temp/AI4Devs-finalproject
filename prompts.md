Los siguientes son prompts reales, copiados tal como se escribieron. Las respuestas se revisaron y las decisiones de producto y arquitectura las tomó el autor.

Las secciones 0 a 7 corresponden a la Entrega 1. La implementación y las pruebas de la Entrega 2 están en la [sección 8](#8-implementación-y-pruebas-entrega-2), y el trabajo hacia la entrega final, en la [sección 9](#9-hacia-la-entrega-final).

## Índice

0. [Análisis previo: ingeniería inversa](#0-análisis-previo-ingeniería-inversa)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)
8. [Implementación y pruebas (Entrega 2)](#8-implementación-y-pruebas-entrega-2)
9. [Hacia la entrega final](#9-hacia-la-entrega-final)

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

**Prompt 3:** respuesta a la pregunta del asistente de si contestaba primero sus dudas.

```text
Sí, respondo esas
```

**Prompt 4:**

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

Las secciones 2 a 7 del README se redactaron en una misma sesión de Claude Code, a partir de los prompts de la sección 1. No hubo un prompt por apartado: el asistente hizo dos propuestas, el autor las aprobó o las respondió, y el asistente redactó todo el documento siguiendo lo aprobado. Abajo están las dos propuestas, resumidas sin cambiar su contenido, y en cada apartado se indica qué decisión y qué paso lo originaron.

**Propuesta 1 del asistente: seis decisiones para aprobar.**

| # | Decisión | Propuesta |
|---|---|---|
| 1 | Problema y caso de uso | "¿Puedo aplicar fitosanitarios ahora en esta estación sin riesgo de deriva?" El productor o aplicador elige la estación y recibe condiciones actuales, índice TIS, recomendación con su motivo e históricos |
| 2 | Alcance del MVP | Acceso, estación, tarjetas, TIS e históricos. Pasan a "Evolución futura" los niveles 2 y 3 completos, la predicción, ENO, humedad de suelos y los demás índices |
| 3 | Arquitectura destino | Frontend web adaptable (React), API en FastAPI y PostgreSQL, más un proceso que cada 10 minutos trae datos de SAT2 y calcula el TIS. Corrige tres fallos del prototipo: contraseña en memoria, datos sin refrescar y falta de persistencia |
| 4 | Agentes de IA | Salen del MVP: la ingesta y el cálculo son procesos normales, porque el criterio pide IA en el ciclo de desarrollo, no dentro del producto |
| 5 | Reglas del TIS | ΔT > 0 nunca da "APTO", un dato faltante da "datos insuficientes", los datos viejos anulan la recomendación y el índice se presenta como orientativo mientras no esté validado |
| 6 | IA en el ciclo de vida | Documentar análisis, diseño, implementación y pruebas, con prompts reales en `prompts.md` y sin inventarlos |

**Propuesta 2 del asistente: orden de trabajo en 10 pasos.** 1, limpieza de la plantilla. 2, ficha, problema y alcance. 3, historias de usuario. 4, arquitectura, componentes, estructura, despliegue, seguridad y plan de tests. 5, modelo de datos, partiendo del modelo `observacion` del sandbox de OpenSpec. 6, tres endpoints en OpenAPI. 7, tres tickets ligados a historia, endpoint y entidad. 8, prototipo, instalación prevista y pull request. 9, `prompts.md`. 10, trazabilidad y control contra los cuatro criterios. Cerraba con tres preguntas sobre la lista de obligatorios, los permisos para publicar el caso y el retiro de la bitácora; el prompt 2 las responde.

### **2.1. Diagrama de arquitectura:**

Paso 4, a partir de la decisión 3.

**Prompt 1:** aprueba la propuesta 1.

```text
Apruebo las 6
```

**Prompt 2:** responde las preguntas de la propuesta 2.

```text
1. Lo obligatorio es todo lo que podamos tener al momento y restringido a lo que se pide en la entrega, el resto es nuestro. Podemos hacer un comentario en lo que se denomina TypeForm
2. Por el momento si podemos
3. correcto, más adelante podemos hacer un flujograma con esto pero por ahora dejémoslo aquí

Empecemos con el trabajo propuesto
```

**Prompt 3:** generó el [ADR-0001](docs/decisions/0001-arquitectura-destino-weather-track.md) y el [plan de implementación de la Entrega 2](docs/plan/plan-implementacion-entrega-2.md).

```text
Ahora hay que crear la arquitectura nueva a donde migrar el proyecto actual. Generar un ADR para preparar la entrega #2. No tenemos que evaluar las partes del pipeline aún, eso será tema del proceso final. Nuestro Lead Time es el 19 de Noviembre por lo que generemos un diagrama de procesos de implementación de actividades para llegar. Documéntalo en un archivo como parte del material a entregar y que utilice un flujograma o alguna herramienta como pert/gant en contexto de Devops. Si es necesario un Plugin, MCP, conector idóneo, etc. de Claude, me lo indicas y lo enchufamos. Investiga los mejores estándares de la industria para realizar esto porque estamos generando material profesional que puede mostrarse a futuros clientes del mercado.
```

### **2.2. Descripción de componentes principales:**

Paso 4, a partir de la decisión 3, con los prompts 1 y 2 de la sección 2.1. En la Entrega 2 se ajustó a lo construido según el ADR-0001 (prompt 3 de la sección 2.1).

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

Paso 4, con los prompts 1 y 2 de la sección 2.1. La estructura real se documentó al cerrar la Entrega 2 ([sección 8.6](#86-cierre)), y `CLAUDE.md` se sumó en la entrega final ([sección 9](#9-hacia-la-entrega-final)).

### **2.4. Infraestructura y despliegue**

Paso 4, con los prompts 1 y 2 de la sección 2.1. La instalación local y la configuración de producción salen de los prompts de la [sección 8.5](#85-despliegue).

### **2.5. Seguridad**

Paso 4, a partir de la decisión 3, que corrige la contraseña en memoria del prototipo. La revisión con pruebas negativas se hizo en la Entrega 2 ([sección 8.6](#86-cierre)).

### **2.6. Tests**

Paso 4. La tabla de casos de referencia sale de la decisión 5, y el asistente recalculó cada caso con un script. La implementación de las pruebas está en la [sección 8](#8-implementación-y-pruebas-entrega-2).

---

## 3. Modelo de Datos

Paso 5, con los prompts 1 y 2 de la sección 2.1. Parte del modelo `observacion` del sandbox de OpenSpec que se analizó en la [sección 0](#0-análisis-previo-ingeniería-inversa), y suma las restricciones que impiden guardar un "APTO" con inversión y lecturas duplicadas, que vienen de la decisión 5.

---

## 4. Especificación de la API

Paso 6: los tres endpoints de lectura en OpenAPI, con valores de ejemplo inventados, con los prompts 1 y 2 de la sección 2.1. En la entrega final se sumaron los contratos de acceso y de estaciones que pidió la revisión de la Entrega 1 (pendiente D2, [sección 9](#9-hacia-la-entrega-final)).

---

## 5. Historias de Usuario

Paso 3, a partir de las decisiones 1 y 5, con los prompts 1 y 2 de la sección 2.1: ver si se puede aplicar, entender el motivo sin confiar en datos dudosos y consultar el histórico de un sensor.

---

## 6. Tickets de Trabajo

Pasos 7 y 10, con los prompts 1 y 2 de la sección 2.1: tres tickets de base de datos, backend y frontend, y la tabla de trazabilidad. En la entrega final se reordenaron las dependencias, como pidió la revisión de la Entrega 1 (pendiente D2, [sección 9](#9-hacia-la-entrega-final)).

---

## 7. Pull Requests

**Prompt 1:** publica la rama de la Entrega 1 después de revisarla.

```text
Sí, commit y push
```

**Prompt 2:**

```text
el PR hay que hacerlo contra este repo: https://github.com/LIDR-academy-temp/AI4Devs-finalproject/
```

**Prompt 3:**

```text
Sí, crea fork y PR
```

**Prompt 4:** cierra una pull request duplicada que se había abierto en el repositorio anterior.

```text
Sí, ciérralo
```

Los prompts de la pull request de la Entrega 2 están en la [sección 8.6](#86-cierre).

---

## 8. Implementación y pruebas (Entrega 2)

Herramientas: Claude Code con Claude Opus 5.5, OpenSpec y las skills `engineering:architecture`, `opsx:propose`, `opsx:apply` y `postman:api-engineer`.

**Cómo se trabajó.** Muchos prompts son breves porque el detalle ya estaba escrito: cada actividad tenía su especificación en OpenSpec, sus tareas verificables y su lugar en el plan. El asistente implementaba y verificaba una actividad, informaba el resultado y esperaba la aprobación humana antes de hacer el commit y de empezar la siguiente. Las decisiones de producto, arquitectura, proveedor y alcance fueron del autor. Se omite un prompt que describía el contenido del archivo `.env`.

### 8.1. Arquitectura y plan

**Prompt 1:**

```text
/engineering:architecture Ahora hay que crear la arquitectura nueva a donde migrar el proyecto actual. Generar un ADR para preparar la entrega #2. No tenemos que evaluar las partes del pipeline aún, eso será tema del proceso final. Nuestro Lead Time es el 19 de Noviembre por lo que generemos un diagrama de procesos de implementación de actividades para llegar. Documéntalo en un archivo como parte del material a entregar y que utilice un flujograma o alguna herramienta como pert/gant en contexto de Devops. Si es necesario un Plugin, MCP, conector idóneo, etc. de Claude, me lo indicas y lo enchufamos. Investiga los mejores estándares de la industria para realizar esto porque estamos generando material profesional que puede mostrarse a futuros clientes del mercado.
```

**Prompt 2:**

```text
La disponibilidad será de lunes a lunes y podemos un promedio de 5 hs día. Las credenciales de acceso a Tecmes ya están y son de 7/24. El acceso a la ingesta para generar la BD se logra con la API "instantaneoEquipoPorSensor" pero desconozco el rango máximo que guarda TECMES y el rango máximo que podemos pedir por sesión. Aprobado el ADR-00001
```

### 8.2. Especificación e ingesta

Invocaciones de skills que hizo el asistente, con estos argumentos:

```text
/opsx:propose weather-track-mvp-nucleo: alcance núcleo del MVP de Weather Track definido en readme.md, docs/decisions/0001-arquitectura-destino-weather-track.md y docs/plan/plan-implementacion-entrega-2.md (actividad A01, punto de control G1)
```

```text
/opsx:apply weather-track-mvp-nucleo, solo el grupo 1 (A02): tareas 1.2 a 1.5
```

**Medición de los límites de SAT2 (A02):**

```text
Si ya está. El test de RecuperarHistoricosEquiposPorSensor positivo desde 1/1/2022 al 1/1/2026 con 51 segundos de demora y 6Mb de tamaño en solo un sensor, como es de esperar según la API.
```

**Índice TIS y unidades (A06):**

```text
En esta carpeta "C:\Dev\SAT2Dashboard\docs" se encuentran archivos en formato pdf en los cuales se validan y/o basan los cálculos del índice TIS, están dentro de tu entorno. Si no puedes leerlos dime qué necesitas para lograrlo. Sigamos con A06 hasta que se me consuma la ventana de créditos de uso
```

```text
Si haz el commit y el push. Verificar el sistema de medidas para que se tenga en cuenta de velocidad en Km/h, medidas en el sistema MKS adaptado porque veo Mph y quiero aclararlo. Ya está corriendo docker compose sin errores, aunque no se como detenerlo. Te lo dejo a vos y verifica lo que necesites d él aunque no hicimos el commit y push antes
```

### 8.3. Acceso, API y frontend

Cada actividad, de A03 a A10, se inició y se cerró con prompts de este tipo:

```text
Sí, empieza A07
```

```text
Sí, commit y push
```

Para los endpoints de A08, el asistente invocó esta skill:

```text
/postman:api-engineer Implementar tres endpoints de lectura ya especificados en la sección 4 del README (OpenAPI 3.0.3) del proyecto Weather Track, con FastAPI. Sin credenciales reales en la nube de Postman.
```

### 8.4. Pruebas y revisión manual

Para las pruebas de extremo a extremo (A11):

```text
Listo podemos continuar
```

Para las pruebas manuales del autor sobre A10:

```text
Si haz el commit y push. Dame las indicaciones para ver las pantallas por mi cuenta, si eso no es posible sin un gran despliegue, déjalo y espero el momento.
```

### 8.5. Despliegue

```text
Tenemos dos situaciones que abordar con respecto al despliegue. Una es generar la aplicación y la documentación asociada para que un usuario pueda hacerlo desde la clonación de un repo en GitHub hasta su PC local. Esto debe ser también parte de la entrega final. Por otro lado y que puede ser parte de una segunda opción plus y es que hagamos el proceso para desplegar en Google Cloud Plataform, también documenta como se logró y desplegarlo real para que lo "visiten" desde internet con mi dominio ya establecido
```

```text
Haz el commit y el push para continuar con la vía normal. El plan del Plus por GCP no vamos a hacerlo aún. Tengo más datos para incluir y que van materializar ese punto más adelante. Nos concentramos en el tema de la entrega 2 y luego veremos. Continuemos por acá
```

### 8.6. Cierre

```text
Sí, empieza A15
```

La revisión de seguridad (A14) se inició dentro del prompt "Continuemos por acá" de la sección 8.5.

**Prompt de la pull request:**

```text
Hagamos el PR de la entrega 2 y deja las fechas como están, solo actualiza la entrega anticipada de de la 2 y continuamos profesionalizando el trabajo para el final para que sea super profesional.
```

---

## 9. Hacia la entrega final

Herramientas: Claude Code con Claude Opus 5.5, OpenSpec y la skill `opsx:propose`. El seguimiento está en la [hoja de ruta](docs/plan/hoja-de-ruta-entrega-final.md). Se omiten dos prompts que aportaban datos de un sistema privado del autor, ajeno a este repositorio.

### 9.1. Hoja de ruta y cuentas

**Prompt 1:** generó la hoja de ruta.

```text
Dejemos todo este proceso documentado para no perder el hilo.

1. Deja asentado el curso de pasos a revisar, hacer e inventariar y dejemos en pausa.
2. volvamos al estado hasta que verifique que la aplicación a desplegar en local, esté como quiero.
3. Para el punto 2 vamos a aislar las credenciales SAT2 de un registro de usuario en el sitio
4. El login que tenemos lo definiremos con un ingreso, registro y recupero de usuario y/o contraseña
5. dado el punto 4 obtendremos una base de clientes para futuro
```

**Prompt 2:** respuesta a las preguntas del asistente. Generó el cambio [`weather-track-registro-cuentas`](openspec/changes/weather-track-registro-cuentas/proposal.md).

```text
Si, solo servidor porque el contrato con SAT2 es privado nuestro y nosotros damos prestación de los datos cosechados. Definir los accesos como se exige en la industria de software. El ingreso público queda en base local y pueden administrar la inscripción o recupero. Luego del registro Reciben correo de confirmación con leyenda para desuscribirse. si no confirman o se desuscriben, se borran de la base. Luego ingresan a la aplicación funcional. Por ahora no hay criterio de niveles o clasificación de usuario
```

Invocación de skill que hizo el asistente:

```text
/opsx:propose weather-track-registro-cuentas: registro público con confirmación por correo, ingreso, recupero de contraseña, baja y autogestión de la cuenta, purga de cuentas sin confirmar o dadas de baja, base de clientes, credenciales SAT2 solo en el servidor, sin niveles de usuario. Fuentes: docs/plan/hoja-de-ruta-entrega-final.md y las respuestas del responsable del 3 nov 2026.
```

### 9.2. Estaciones

**Prompt 1:** pidió revisar la interfaz sin tocar nada.

```text
Hago referencia a "Estaciones" porque son solo centrales meteorológicas que se reciben de SAT2. Estas son las que las especificaciones denominan como "equipos". No son instancias de una misma central ni tampoco son las opciones de visibilidad de servicios. Por ahora solo hay una, INTA Pergamino, en el futuro pueden haber más por lo que debe haber un selector y que hoy solo despliega una, la obtenida como Equipo 1 en la API recuperarEquipo. Si hay alguna duda de esto me preguntas antes de tocar nada. Revisa la lógica de la UI para revisar este tema y si hay inconsistencias, repito, me preguntas y lo vamos resolviendo juntos
```

**Prompt 2:** respuesta a las cinco inconsistencias que encontró el asistente.

```text
A. Podemos generar 2 casos de prueba para recrear el selector "caso de prueba - x" y solo el primero ingesta de la BD, el resto no
B. Confirmado
C. Sigue visible, no renderiza tablero instantáneos, muestra leyenda "equipo inactivo - solo históricos"
D. La llamamos como la real
```

Como la respuesta A admitía más de una lectura, el asistente preguntó antes de seguir. El autor eligió: "Caso 1 con datos reales", "Siempre visible" para el selector y "Lista de sensores" para llegar a los históricos de un equipo inactivo.

**Prompt 3:** aprobó pasar la resolución al cambio [`weather-track-estaciones`](openspec/changes/weather-track-estaciones/proposal.md).

```text
Sí, pásala
```

### 9.3. Devolución de la Entrega 1

**Prompt 1:**

```text
Apruebo los cambios y luego lee el pdf dentro de feedback. Lo vas a necesitar para que veas lo que la academia dictaminó sobre la 1ra entrega. No redefinas nada todavía, saquemos conclusiones y de ser necesario hacemos un balance de valuaciones, requisitos, etc.
```

**Prompt 2:** sumó los pendientes D1 a D7 a la hoja de ruta.

```text
Sí, súmalos
```

**Prompts 3 a 6:** D1 ([`CLAUDE.md`](CLAUDE.md)), su commit, D2 (contratos de la API y orden de los tickets en el README) y D3 (esta misma actualización de `prompts.md`).

```text
Sí, empieza D1
```

```text
Sí, commit y push
```

```text
Sí, sigue con D2
```

```text
Sí, sigue con D3
```
