# system-monitoring Specification

## Purpose
Avisa a los administradores de Weather Track cuando la ingesta, la base de datos o los accesos muestran un problema, en pantalla y por correo, guarda la historia de esas mediciones para verla en Grafana y muestra a todas las cuentas la salud de cada estación.

## Requirements

### Requirement: Controles de salud

El proceso de ingesta SHALL evaluar en cada ciclo los controles de salud: datos de más de 30 minutos o 3 ciclos fallidos seguidos en una estación activa, menos del 10 % libre en el disco de la base, y 20 o más ingresos fallidos en 15 minutos o una dirección IP bloqueada por superar su límite. En modo prueba MUST NOT evaluar los controles de ingesta.

#### Scenario: Datos viejos

- **WHEN** la última lectura de una estación activa tiene 31 minutos
- **THEN** el control de datos viejos de esa estación queda en alerta

#### Scenario: Límite de la frescura

- **WHEN** la última lectura de una estación activa tiene exactamente 30 minutos
- **THEN** el control de datos viejos sigue bien

#### Scenario: Ciclos fallidos

- **WHEN** los últimos 3 ciclos de una estación activa terminaron en error
- **THEN** el control de ciclos fallidos de esa estación queda en alerta

#### Scenario: Disco casi lleno

- **WHEN** queda menos del 10 % libre en el disco de la base
- **THEN** el control de disco queda en alerta

#### Scenario: Posible fuerza bruta

- **WHEN** hay 20 ingresos fallidos en los últimos 15 minutos
- **THEN** el control de accesos queda en alerta

### Requirement: Alertas sin repetición

El sistema SHALL abrir una alerta cuando un control pasa a fallar y cerrarla cuando vuelve a estar bien, y SHALL avisar por correo a cada administrador activo al abrirla y al cerrarla. Mientras una alerta sigue abierta, el sistema MUST NOT volver a avisar. Ni las alertas ni sus correos MUST incluir credenciales, correos de cuentas ni direcciones IP.

#### Scenario: Alerta nueva

- **WHEN** un control falla y no había una alerta abierta para él
- **THEN** se abre una alerta y cada administrador activo recibe un correo

#### Scenario: Falla que continúa

- **WHEN** el control sigue fallando en los ciclos siguientes
- **THEN** no se envían más correos

#### Scenario: Normalización

- **WHEN** el control vuelve a estar bien
- **THEN** la alerta se cierra y cada administrador activo recibe un aviso de normalización

### Requirement: Estado del sistema en pantalla

La pantalla de administración SHALL mostrar el estado de cada control, con texto y no solo con color, el estado del proceso de ingesta y las últimas 20 alertas. El estado del proceso de ingesta SHALL calcularse con la hora del último ciclo, para que se vea aunque el proceso esté detenido. Para cualquier cuenta sin el rol, la ruta de este estado MUST responder igual que una ruta inexistente.

#### Scenario: Proceso de ingesta detenido

- **WHEN** no hubo ningún ciclo en los últimos 20 minutos
- **THEN** el panel muestra el proceso de ingesta sin actividad

#### Scenario: Cuenta común

- **WHEN** una cuenta sin el rol consulta el estado del sistema
- **THEN** recibe la misma respuesta 404 que una ruta inexistente

### Requirement: Métricas para Prometheus

El proceso de ingesta SHALL publicar en un puerto interno las métricas de frescura, ciclos fallidos, tamaño de la base, disco libre, ingresos fallidos y alertas abiertas. Ese puerto MUST NOT publicarse fuera de la red interna, y las métricas MUST NOT incluir correos, direcciones IP ni credenciales.

#### Scenario: Consulta interna

- **WHEN** Prometheus consulta las métricas del proceso de ingesta por la red interna
- **THEN** obtiene la antigüedad de la última lectura de cada estación activa

#### Scenario: Consulta desde afuera

- **WHEN** alguien pide las métricas a través del proxy
- **THEN** no las obtiene

### Requirement: Tablero y aviso de proceso detenido

El perfil de monitoreo SHALL levantar Prometheus y Grafana con su configuración versionada: un tablero de Weather Track y una alerta que avisa por correo si el proceso de ingesta deja de publicar métricas durante 5 minutos. Grafana MUST escuchar solo en la computadora local, MUST exigir la contraseña de su administrador y MUST NOT permitir registro ni acceso anónimo.

#### Scenario: Proceso de ingesta detenido con el perfil activo

- **WHEN** el proceso de ingesta deja de publicar métricas durante 5 minutos
- **THEN** Grafana envía un correo a la dirección de alertas configurada

#### Scenario: Acceso a Grafana

- **WHEN** alguien abre Grafana sin ingresar
- **THEN** ve la pantalla de ingreso y no el tablero

### Requirement: Salud de la estación

La pantalla de la estación y el detalle de un sensor SHALL mostrar a todas las cuentas la hora actual en hora de Argentina, la hora y el resultado del último ciclo de ingesta, la hora del último dato de SAT2 y un semáforo de salud con su texto, calculado al leer.

#### Scenario: Cuenta común

- **WHEN** una cuenta sin el rol de administrador abre una estación
- **THEN** ve la franja de salud con el semáforo y las tres horas

### Requirement: Estados del semáforo

El semáforo SHALL mostrar «En vivo» si el último ciclo terminó bien hace 20 minutos o menos y el dato tiene 30 minutos o menos; «Con demoras» si hubo un ciclo en los últimos 20 minutos pero terminó con error o el dato tiene más de 30 minutos; y «Caído» si no hubo ningún ciclo en más de 20 minutos.

#### Scenario: Estación en vivo

- **WHEN** el último ciclo terminó bien hace 5 minutos y el dato tiene 8 minutos
- **THEN** el semáforo muestra «En vivo»

#### Scenario: SAT2 sin datos nuevos

- **WHEN** el último ciclo terminó bien hace 5 minutos y el dato tiene 45 minutos
- **THEN** el semáforo muestra «Con demoras»

#### Scenario: Proceso de ingesta detenido

- **WHEN** el último ciclo terminó hace 21 minutos
- **THEN** el semáforo muestra «Caído»
