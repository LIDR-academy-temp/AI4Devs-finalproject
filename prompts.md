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

**Prompt 1:**
Ayudame a redactar la descripción de un proyecto para desarrollar un software, el cual será un sistema que permita conectar a un empleador que este buscando personas que estén disponibles para trabajar y puedan desplazarse hasta el lugar de trabajo incluso si están en diferente ciudad. Es decir que va a tener las funcionalidades del aspirante al empleo y el empleador como lo tiene LinkedIn pero adicionalmente tiene la funcionalidad de una aplicación como Uber en la que se le notifica a la persona y pueden establecer contacto para desplazarse a un empleo o servicio.
El sistema tendrá un modulo para que un empleador pueda registrarse como empresa o persona natural y registre o seleccione los perfiles que necesita.
También tendrá un modulo para que las personas puedan registrarse y subir diferentes skills (con alguna certificación y mecanismos de veracidad) para que un empleador pueda realizar búsquedas por los skills y verificar la información de las personas.
**Prompt 2:**

**Prompt 3:**

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**

Con la mejor calidad técnica y evitando descripciones redundantes o innecesarias construye la 'Arquitectura del Sistema', teniendo en cuenta que entre las técnologias que usará el sistema están: 
* React para el Front.
* Un componente GIS para localización (recomiendame uno gratuito de buena calidad en los mapas, que no tenga mucha complejidad para implementarlo y preferiblemente buena compatibilidad y bajo consumo de memoria)
* Microservicios en Java 21 con Quarkus y clean arquitecture. (Basate en estos dos links para su estructura:
https://medium.com/bancolombia-tech/clean-architecture-aislando-los-detalles-4f9530f35d7a
https://bancolombia.github.io/scaffold-clean-architecture/docs/intro/).
* Base de datos PostgresSQL

Elabora por lo menos tres diagramas de arquitectura y un ejemplo de diagrama de secuencia con un flujo.

**Prompt 2:**

Con la mejor calidad técnica y evitando descripciones redundantes o innecesarias construye la 'Arquitectura del Sistema', teniendo en cuenta que entre las tecnologías que usará el sistema están: 
* React para el Front.
* Un componente GIS para localización (recomiendame uno gratuito de buena calidad en los mapas, que no tenga mucha complejidad para implementarlo y preferiblemente buena compatibilidad)
* Microservicios en Java 21 con Quarkus y clean arquitecture. (Básate en estos dos links para su estructura:
https://medium.com/bancolombia-tech/clean-architecture-aislando-los-detalles-4f9530f35d7a
https://bancolombia.github.io/scaffold-clean-architecture/docs/intro/).
* Base de datos PostgresSQL

Elabora por lo menos tres diagramas de arquitectura relevantes y un ejemplo de diagrama de secuencia con un flujo.
Ten en cuenta que la información que generes reposara en un archivo *.md por lo cual es necesario generar los diagramas y tablas aptos para un archivo de texto básico sin imágenes ni manejo de tablas.
Por ultimo usa el siguiente orden para estructurar la información: 
2. Arquitectura del Sistema
2.1. Diagrama de arquitectura:
> Usa el formato que consideres más adecuado para representar los componentes principales de la aplicación y las tecnologías utilizadas. Explica si sigue algún patrón predefinido, justifica por qué se ha elegido esta arquitectura, y destaca los beneficios principales que aportan al proyecto y justifican su uso, así como sacrificios o déficits que implica.
2.2. Descripción de componentes principales:
> Describe los componentes más importantes, incluyendo la tecnología utilizada.
2.3. Descripción de alto nivel del proyecto y estructura de ficheros
> Representa la estructura del proyecto y explica brevemente el propósito de las carpetas principales, así como si obedece a algún patrón o arquitectura específica.
2.4. Infraestructura y despliegue
> Detalla la infraestructura del proyecto, incluyendo un diagrama en el formato que creas conveniente, y explica el proceso de despliegue que se sigue.
2.5. Seguridad
> Enumera y describe las prácticas de seguridad principales que se implementaran en el proyecto, añadiendo ejemplos si procede.
 2.6. Tests
> Describe brevemente algunos de los tests para realizar.


**Prompt 3:**



---

### 3. Modelo de Datos

**Prompt 1:**

Diseña un modelo de datos para una base de datos relacional (inicialmente PostgresSQL) para el proyecto que represente las estructuras de datos requeridas en el proyecto como por ejemplo:

Registro e ingreso de información de aspirantes a empleos o prestadores de servicio con sus diferentes skills o habilidades.
Empleadores que puedan registrar información de (empresa, fabrica o lugar) y buscar personas para el tipo de labor o servicio que requieran.
Registro de personas y empresas con roles y permisos requeridas para este sistema.
Registro de información básica de los aspirantes (nombres, apellidos, documento, lugar de nacimiento, fecha de nacimiento, teléfono, direccion1, direccion2, direccion3, coordenadaDir1, coordenadaDir2, coordenadaDir3) y otros que consideres necesarios.
Registro de información básica del empleador (nombres, apellidos, documento, lugar de nacimiento, fecha de nacimiento, teléfono, direccion1, direccion2, direccion3), también una tabla con la relación de empresas, fabricas o lugares de producción donde valla a requerir empleados o servicios con la información que consideres necesaria cono por ejemplo dirección y coordenadas.
Ten en cuenta que la información que generes reposara en un archivo *.md por lo cual es necesario generar los diagramas y tablas aptos para un archivo de texto básico sin imágenes ni manejo de tablas.
Por ultimo usa el siguiente orden para estructurar la información: 

Modelo de Datos 3.1. Diagrama del modelo de datos: Recomendamos usar mermaid para el modelo de datos, y utilizar todos los parámetros que permite la sintaxis para dar el máximo detalle, por ejemplo las claves primarias y foráneas.
3.2. Descripción de entidades principales:
Recuerda incluir el máximo detalle de cada entidad, como el nombre y tipo de cada atributo, descripción breve si procede, claves primarias y foráneas, relaciones y tipo de relación, restricciones (unique, not null…), etc.
**Prompt 2:**

**Prompt 3:**

---

### 4. Especificación de la API

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 5. Historias de Usuario

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 6. Tickets de Trabajo

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**

---

### 7. Pull Requests

**Prompt 1:**

**Prompt 2:**

**Prompt 3:**
