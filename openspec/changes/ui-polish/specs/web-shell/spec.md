## MODIFIED Requirements

### Requirement: Identidad visible
El layout SHALL mostrar en todo momento el nombre (`displayName`) y el rol del usuario y el botón **Sign out**, tomados de `GET /auth/me`. La barra superior SHALL no listar los merchants del alcance del usuario: el alcance lo aplica el API y la elección de merchant activo es otra pantalla (#83).

#### Scenario: Alcance asignado
- **WHEN** `analyst` entra
- **THEN** la cabecera muestra `Analyst`, `analyst` y **Sign out**, y no muestra `Merchant A, Merchant B`

#### Scenario: Alcance total
- **WHEN** `admin` entra
- **THEN** la cabecera muestra `Admin`, `admin` y **Sign out**, y no muestra `All merchants`

## ADDED Requirements

### Requirement: Navegación lateral por grupos
En la barra lateral, las entradas de un grupo SHALL verse sangradas respecto al título de su grupo (Reconciliation, Settlements, Search, Reports, Administration), como en el prototipo navegable. La entrada Dashboard, que no tiene grupo, SHALL alinearse con los títulos.

#### Scenario: Sangría de las entradas
- **GIVEN** `analyst` en Dashboard a 1280 px
- **WHEN** mira la barra lateral
- **THEN** New Reconciliation y Settlement List empiezan más a la derecha que los títulos `RECONCILIATION` y `SETTLEMENTS`, y Dashboard empieza a la altura de los títulos

#### Scenario: Entradas deshabilitadas
- **WHEN** mira una entrada aún no construida, como In Progress
- **THEN** tiene la misma sangría que las entradas activas de su grupo

### Requirement: Aspecto de las tarjetas
Toda tarjeta (Card) SHALL mostrar una sombra suave que la separe del fondo. La sombra SHALL salir de una variable del tema con un valor para el tema claro y otro para el oscuro, nunca de un valor fijo en el componente. La sombra SHALL sumarse a lo que la tarjeta ya tenía: su relleno interior y su borde suave del color del tema, nunca un borde oscuro.

#### Scenario: Tarjetas del Settlement Summary
- **GIVEN** el Settlement Summary de un intento a 1280 px
- **WHEN** lo mira con el tema claro
- **THEN** cada tarjeta (totales, amount payable, marcas, fees) se distingue del fondo por una sombra suave hacia abajo y a la derecha

#### Scenario: Relleno y borde de la tarjeta
- **GIVEN** Login, New Reconciliation, Settlement Review, Settlement Summary o Settlement List
- **WHEN** mira cualquier tarjeta
- **THEN** su contenido no toca el borde, que conserva el gris suave del tema, y la sombra se ve fuera de él

#### Scenario: Sombra del tema
- **WHEN** se revisa la hoja de estilos
- **THEN** la sombra de la tarjeta es una variable definida en el tema claro y en el oscuro, y el componente solo la referencia

### Requirement: Colores de estado
Los estados en Badge SHALL llevar un color según su sentido, siempre con su texto (nunca solo color) y con contraste AA (4,5:1) entre texto y fondo: verde para lo correcto o terminado bien, ámbar para lo que pide atención sin bloquear, rojo para lo que bloquea y gris para lo que no aplica o es neutro. Los colores SHALL ser variables del tema, con valor para el tema claro y el oscuro.
#### Scenario: Resultados de las validaciones
- **GIVEN** la corrida vigente de `batch-issues` con `Provider mismatch` en `passed`, siete validaciones en `warning` y ninguna `blocked`
- **WHEN** abre el paso Analysis
- **THEN** `Passed` se ve en verde, cada `Warning` en ámbar y el estado global `Warnings` en ámbar, cada uno con su texto

#### Scenario: Corrida bloqueada
- **GIVEN** la corrida vigente de `batch-blocked`
- **THEN** el estado global `Blocked` y el resultado `Blocked` de `Provider mismatch` se ven en rojo, con su texto

#### Scenario: No aplicable y no implementada
- **WHEN** una validación llega con `outcome = not_applicable` o `not_implemented`
- **THEN** `n/a` o `Not implemented` se ven en gris, con su texto

#### Scenario: Estados del import
- **WHEN** la cabecera del import muestra su estado
- **THEN** `validated` y `processed` se ven en verde; `uploaded`, `mapped`, `analyzed` y `cancelled` en gris; siempre con el texto del estado

#### Scenario: Estados del intento
- **WHEN** el Settlement Summary, Settlement List o una aparición de un hallazgo muestran el estado de un intento
- **THEN** `Processed · pending payment` (`processed`) se ve en ámbar, `Paid` (`paid`, `settled`) en verde y `Undone` en gris, siempre con su texto
- **AND** en el Summary, el aviso `Movements are not Settled yet: that happens when the batch is marked as paid.` se ve en ámbar, como su Badge

#### Scenario: Contraste
- **WHEN** se calcula el contraste de cada color de estado sobre su fondo desde los tokens OKLCH del tema con la fórmula de WCAG
- **THEN** todos llegan al menos a 4,5:1, en el tema claro y en el oscuro (cálculo aceptado en la revisión 12.2)

### Requirement: Navegación dentro de la página: desplazamiento y foco
Una acción que solo cambia lo que muestra la pantalla actual (validación, "Show … rows", filtro, página, pestaña o ciclo) SHALL dejar la página en su posición. Si es un botón que actualiza una lista, el foco SHALL ir al encabezado de esa lista; un desplegable o una fecha SHALL conservar el foco. Llegar por enlace, recargar o volver atrás SHALL no mover el foco.

#### Scenario: Elegir una validación
- **GIVEN** `analyst` en el paso Analysis de `batch-issues`, desplazado hasta la tabla de las ocho validaciones
- **WHEN** pulsa `Missing previous to batch`
- **THEN** la página no vuelve arriba, la lista de hallazgos de esa validación queda a la vista y el foco está en su encabezado

#### Scenario: Mostrar las filas sin asociar
- **GIVEN** el import de `batch-issues` analizado, con `Unmatched 1`
- **WHEN** pulsa **Show unmatched rows** en el contador
- **THEN** la página no vuelve arriba, la tabla de filas filtrada por `Unmatched` queda a la vista y el foco está en su encabezado

#### Scenario: Filtro y página de la tabla de filas
- **GIVEN** la tabla de filas de `batch-clean` a la vista
- **WHEN** pulsa el filtro `Matched` y después **Next**
- **THEN** en cada paso la página no vuelve arriba y el foco va al encabezado de la tabla de filas

#### Scenario: Página de la lista de hallazgos
- **GIVEN** la lista de hallazgos de una validación con más de una página
- **WHEN** pulsa **Next**
- **THEN** la página no vuelve arriba y el foco va al encabezado de la lista de hallazgos

#### Scenario: Abrir y cerrar un hallazgo
- **GIVEN** la lista de hallazgos a la vista
- **WHEN** abre un hallazgo y cierra el panel
- **THEN** la página sigue en la misma posición y el foco vuelve al ID que lo abrió

#### Scenario: Settlement List
- **GIVEN** la lista de ProviderA-USD desplazada hasta la tabla
- **WHEN** elige `Paid` en el estado con el teclado
- **THEN** la página no vuelve arriba y el foco sigue en el desplegable de estado
- **WHEN** después pulsa **Next**
- **THEN** la página no vuelve arriba y el foco va al encabezado de la tabla de settlements

#### Scenario: Pestañas y ciclos del Settlement Summary
- **GIVEN** el Settlement Summary de `batch-clean` desplazado hasta las pestañas
- **WHEN** abre **Movements**, elige `I` y pulsa **Next**
- **THEN** la página no vuelve arriba en ningún paso; al abrir la pestaña el foco sigue en ella, y al elegir el ciclo o la página el foco va al encabezado de la tabla de movimientos

#### Scenario: Recargar o llegar por enlace
- **WHEN** abre `/imports/<importId>?step=analysis&validation=missing_previous_to_batch&match=unmatched` por enlace o recarga esa dirección
- **THEN** ve la lista de hallazgos y la tabla filtrada, y el foco no se mueve a ninguna de las dos

#### Scenario: Una acción que no cambia nada y volver atrás
- **GIVEN** Analysis con `validation=missing_previous_to_batch` en la primera página de sus hallazgos
- **WHEN** pulsa `Missing previous to batch` (la validación ya elegida), va a Dashboard y vuelve con Atrás
- **THEN** ve la lista de hallazgos y el foco no se mueve a su encabezado; lo mismo con **Show unmatched rows** cuando la tabla ya está filtrada por `Unmatched`
