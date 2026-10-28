> Detalla en esta sección los prompts principales utilizados durante la creación del proyecto, que justifiquen el uso de asistentes de código en todas las fases del ciclo de vida del desarrollo. Esperamos un máximo de 3 por sección, principalmente los de creación inicial o  los de corrección o adición de funcionalidades que consideres más relevantes.
Puedes añadir adicionalmente la conversación completa como link o archivo adjunto si así lo consideras


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

EXPLORE the current repository for functional detail of what the app in developmeant is and does. Generate a detailed PRD document withouth ANY technical/stack or implementataion detail, only user facing functionality. This document is meant to be consumed for an eventual, ai agentically driven implementation, so keep it tech-agnostic.
The final output can be an .md file

*Nota*: Este prompt fue ejecutado en el proyecto/repo original. El output de dicho prompt (el PRD) fue luego importado al proyecto actual.

**Prompt 2:**

**Prompt 3:**

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

Based on the PRD, let´s start defining arquitecture and tech stack for a WEB application. Present alternatives (5 at most) for each service layer, with pros and cons and list the top three combinations. Each decision we make together will eventually be documented in an ADR document so keep track of the rationale we apply.

**Prompt 2:**

**Prompt 3:**

### **2.2. Descripción de componentes principales:**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.4. Infraestructura y despliegue**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.5. Seguridad**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

### **2.6. Tests**

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 3. Modelo de Datos

Based on the existing PRD and ADR(s) documents, define a data model that fits the tech stack, arquitecture and funcional intent of the application. Illustrate the model with a mermaid graph and add reference to the corresponding documents when applicable.
Make sure to add detailed descriptions for each of the main entities already defined in the documentation.

**Prompt 2:**

**Prompt 3:**

---

### 4. Especificación de la API

Based on the existing PRD and ADRs documents, describe the 3 most important API endpoints in OpenAPP format. Add references to the corresponding documents when applicable. For each endpoint add a request-response example. 

**Prompt 2:**

**Prompt 3:**

---

### 5. Historias de Usuario

Based on the existing PRD and ADRs documents, document the three main functionalitites as User Stories. The stories must include acceptance criterias clearly defined in Gherkin

----------------------------------------------------------------------------------------------
The three user stories you have defined in the document have two different functionalitites merged in one (create test case AND organize in folders, create execution AND run it, open Overview Dashboard AND browse to the origin test case). Modify them to only cover ONE of these for each user story (create test case, create execution, browse to the original test case from bug)

**Prompt 3:**

---

### 6. Tickets de Trabajo

Define the three main technical work tickets for development: one for backend, one for frontend, one for databse. Provide all necessary details to develop the task end to end observing good practices and all specifications already covered within the PRD and ADR documentation.

**Prompt 2:**

**Prompt 3:**

---

### 7. Pull Requests

**Prompt 1:**

I want to start with the implementation of this project. Based on the PRD and ADRs, what would be the propper order to scaffold and implement? Propose an efficient order/roadmap that implies the least ammount of risk and re-work.

**Prompt 2:**

Propose an alternative order/roadmap intended for an initial MVP version that implies minimal rework in an eventual full product implementation.

**Prompt 3:**

Let´s start with Phase 0 and let´s keep tracking the decisions in the corresponding ADRs

**Prompt 4:**

Before we proceed: we must create the CLAUDE.md for this project stating the nature of the app in development, tech stach, etc.



**Prompt 5:**

What is the best practice? 

- Split Phase tasks into user stories and then use said stories as input for openspec:propose?
- Feed openspec:propose the Phase tasks as already documented in the PRD+Roadmap+ADrs?


**Prompt 6:**

Best thing before proceeding is to add its own dedicated Phase to frontend bootstrap so the final is usabable and demoable


**Prompt 7:**

/opsx:propose <Phase> <Slice>. Refer to PRD.md and ADR documents as needed.


**Prompt 8:**

I want to properly set up the front end and the UI before we move on. Let´s first decide on FE tech stack / libraries and framework. What are the best options given our purpose and current implementation? Let´s keep track of decisions in an ADR(s)

**Prompt 9:**

I want the UI to be closer to end-use ready: actualk stylings (color, look and feel), I want the sidebar to be collapsable and to each option to have its own icon. I also want the TEST CASES page to feature a FOLDER TREE structure that allows the user to organize its test cases (4 levels deep max). When creating an execution, the user should see selected test cases in a parallel panel that gets filled, allowing them to rearrange the order (drag and drop as in test case folder tree). Allow re-order from within an execution too: each row of each run within an execution should be rearrangeable with drag and drop too.
See if the elements above clash with the PRD and ask questions and propose changes or additions as needed. Give me suggestions for general look and feel.


**Prompt 10:**

Let´s fix drag behavior: do not rearrange the other elements in realtime as user drags, this causes folders to move out of the way when trying to drop a test case into a folder. Just show a line "in between" the two elements where the element will be placed when dropped and re-arrange everything once dropped. Also, folders without contents shouldn´t be expanded