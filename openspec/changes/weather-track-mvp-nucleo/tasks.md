# Tasks

Los grupos siguen las actividades del [plan de implementación](../../../docs/plan/plan-implementacion-entrega-2.md). A01 es este mismo cambio.

## 1. Contrato con SAT2 (A02)

- [x] 1.1 Crear `.env.example` sin valores reales y agregar `.env` a `.gitignore`, y verificar que `git check-ignore .env` lo ignora
- [x] 1.2 Escribir la prueba de límites, leyendo las credenciales del entorno y con una consulta por vez, y verificar con un cliente simulado que nunca imprime credenciales ni tokens
- [x] 1.3 Ejecutar la prueba de límites contra SAT2 y registrar en `design.md` el rango seguro, la antigüedad y los tiempos, y verificar que el registro no contiene credenciales
- [x] 1.4 Crear datos de prueba ficticios para catálogo, instantáneos e históricos, con coma decimal, centinela, orden descendente y lecturas ausentes, y verificar que una búsqueda de tokens en esa carpeta no da resultados
- [x] 1.5 Definir la interfaz del cliente de SAT2 y el cliente simulado, y verificar con pruebas que devuelve los datos de prueba sin acceder a la red

## 2. Repositorio y contenedores (A03)

- [x] 2.1 Crear la estructura `backend/` y `frontend/` del README y fijar dependencias con archivos de bloqueo, y verificar que ambas instalaciones funcionan desde cero
- [x] 2.2 Crear `docker-compose.yml` con proxy, API, worker y PostgreSQL 18, y verificar que `docker compose up` deja los servicios saludables en modo simulado
- [x] 2.3 Agregar una prueba de arquitectura que falle si `dominio` importa `api`, `ingesta` o `datos`, y verificar que falla con una importación de ejemplo

## 3. Base de datos (A04, WT-DB-01)

- [x] 3.1 Configurar las migraciones y crear las tablas de la sección 3 del README, más `SESION` e `INTENTO_ACCESO`, y verificar que `upgrade` y `downgrade` funcionan sobre una base vacía
- [x] 3.2 Agregar restricciones `UNIQUE`, `CHECK` e índices, y verificar con pruebas de integración los criterios de aceptación de WT-DB-01
- [x] 3.3 Crear semillas idempotentes con estación, sensores y usuario ficticios, y verificar que ejecutarlas dos veces no duplica datos

## 4. Motor de recomendación (A05, WT-BE-01)

- [ ] 4.1 Implementar los factores y el índice como funciones puras, y verificar los índices de los casos de la sección 2.6 del README
- [ ] 4.2 Implementar el estado base con sus límites exactos y las reglas R1, R3 y R4 con sus motivos, y verificar todos los escenarios de `application-recommendation` que no dependen de la hora
- [ ] 4.3 Medir la cobertura del motor y verificar que alcanza al menos 90 %

## 5. Ingesta (A06, WT-BE-03)

- [ ] 5.1 Implementar la normalización de números, fechas y nombres, y verificar los escenarios de normalización con los datos de prueba
- [ ] 5.2 Implementar la clasificación de calidad con su tabla de rangos, y verificar los escenarios de centinela, fuera de rango y humedad incoherente
- [ ] 5.3 Implementar la sincronización del catálogo, y verificar con el cliente simulado los escenarios de altura, acentuación y sensor desconocido
- [ ] 5.4 Implementar el ciclo de 10 minutos con la renovación de sesión y el registro de ejecuciones, y verificar con el cliente simulado que no duplica mediciones y que un error de la fuente queda registrado
- [ ] 5.5 Invocar el motor después de guardar las lecturas y persistir la recomendación, y verificar que queda una por medición y versión
- [ ] 5.6 Implementar la carga inicial de 31 días, con ventana adaptable, pausa, reanudación y detención, y verificar sus escenarios, incluidos la respuesta recortada y la prioridad del ciclo
- [ ] 5.7 Ejecutar el worker contra SAT2 durante al menos tres ciclos, y verificar que hay 31 días y mediciones nuevas guardadas, y que los registros no contienen credenciales (punto de control G3)

## 6. Acceso (A07, WT-BE-04)

- [ ] 6.1 Implementar el hash de contraseñas y el comando de alta de cuentas y estaciones, y verificar que la base no contiene contraseñas en texto plano
- [ ] 6.2 Implementar inicio y cierre de sesión, y verificar los escenarios de `account-access`, incluidos la cuenta desactivada, la sesión vencida y el mensaje genérico
- [ ] 6.3 Implementar el límite de intentos, y verificar el estado 429 y el fin de la espera con un reloj simulado
- [ ] 6.4 Implementar la autorización por estación y `GET /estaciones`, y verificar los estados 401 y 403 y el listado filtrado

## 7. Endpoints de lectura (A08, WT-BE-01 y WT-BE-02)

- [ ] 7.1 Implementar `GET /estaciones/{estacionId}/recomendacion` con la regla R2, el aviso y la versión del método, y verificar con un reloj simulado los límites de 30 y 31 minutos y el motivo `SIN_MEDICIONES`
- [ ] 7.2 Implementar `GET /estaciones/{estacionId}/condiciones-actuales`, y verificar los estados de vigencia, la alarma y la última ingesta exitosa
- [ ] 7.3 Implementar `GET /estaciones/{estacionId}/sensores/{sensorId}/historico`, y verificar el orden, el rango inválido, el sensor ajeno y el resumen que excluye faltantes
- [ ] 7.4 Comparar el OpenAPI generado con la sección 4 del README, y verificar que las respuestas validan contra el esquema

## 8. Frontend base (A09, WT-FE-02)

- [ ] 8.1 Crear el cliente de la API con tipos derivados del OpenAPI, y verificar que la compilación falla si cambia un campo usado
- [ ] 8.2 Construir la pantalla de acceso y el manejo de sesión vencida, y verificar con pruebas de componentes el error genérico y la redirección
- [ ] 8.3 Construir la selección de estación y el detalle de sensor, y verificar los escenarios de una, varias y ninguna estación
- [ ] 8.4 Construir los históricos de 7 y 31 días, y verificar el resumen, los huecos sin interpolar y el aviso de falta de datos

## 9. Pantalla de decisión (A10, WT-FE-01)

- [ ] 9.1 Construir el bloque de estado con texto, color, ícono, índice, hora, motivos y aviso, y verificar cada uno de los cinco estados con una prueba
- [ ] 9.2 Construir las tarjetas con calidad y alarma, y verificar los casos `FALTANTE`, `SOSPECHOSO` y en alarma
- [ ] 9.3 Implementar la actualización cada 60 segundos y los avisos de falta de conexión con la API y con la fuente, y verificar que tras un error el estado anterior no queda como vigente
- [ ] 9.4 Revisar la pantalla con un ancho de 360 píxeles, y verificar que no hay desplazamiento horizontal

## 10. Integración (A11)

- [ ] 10.1 Escribir las pruebas E2E de HU1 y HU2 en modo simulado, y verificar que pasan con la pila completa en contenedores
- [ ] 10.2 Escribir la prueba básica de HU3, y verificar que muestra el gráfico y el resumen (punto de control G4)

## 11. Despliegue (A13, WT-OPS-01)

- [ ] 11.1 Elegir el proveedor del servidor y registrar la decisión, y verificar que cubre contenedores, HTTPS y volumen persistente
- [ ] 11.2 Desplegar la pila con credenciales solo en el entorno del servidor, y verificar por HTTPS el acceso, la recomendación y un ciclo real del worker
- [ ] 11.3 Documentar en el README la instalación local real, y verificar que los comandos funcionan en un clon limpio en modo simulado

## 12. Revisión de seguridad (A14)

- [ ] 12.1 Buscar secretos en todo el historial del fork, y verificar que no aparecen credenciales ni tokens
- [ ] 12.2 Revisar autorización, sesión y entradas con pruebas negativas sobre el despliegue, y verificar que no quedan hallazgos críticos abiertos

## 13. Cierre (A15)

- [ ] 13.1 Actualizar el README y `prompts.md` con lo implementado, y verificar que nada planificado figura como hecho ni al revés
- [ ] 13.2 Preparar la demostración del flujo principal, y verificar que se puede ejecutar de principio a fin sobre el despliegue
- [ ] 13.3 Abrir el PR de la Entrega 2 contra el repositorio de LIDR, y verificar que contiene solo los archivos esperados (punto de control G5)

## Workflow follow-up

- Archivar el cambio con `/opsx:archive` después de la revisión de la Entrega 2, para promover las specs a `openspec/specs/`.
- Abrir un cambio propio por cada extensión X1 a X4 que se active.
