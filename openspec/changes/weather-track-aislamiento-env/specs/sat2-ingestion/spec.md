# Spec Delta

## ADDED Requirements

### Requirement: Pilas aisladas sin credenciales reales

Una pila de Docker Compose levantada con un nombre de proyecto propio, para pruebas o verificaciones, MUST NOT cargar el `.env` de la instalación real en ningún servicio. Su proceso de ingesta SHALL recibir solo las variables del archivo indicado para esa pila. La instalación real SHALL seguir leyendo su `.env` sin ninguna configuración adicional.

#### Scenario: Pruebas de extremo a extremo

- **WHEN** las pruebas de extremo a extremo levantan su pila aislada en una computadora con un `.env` real
- **THEN** el proceso de ingesta de esa pila no recibe la clave privada ni las credenciales de SAT2 de ese `.env`

#### Scenario: Instalación real

- **WHEN** el responsable levanta su instalación con `docker compose up -d`
- **THEN** el proceso de ingesta lee el `.env`, como antes

#### Scenario: Herramienta nueva sin aislar

- **WHEN** una herramienta del repositorio levanta una pila aislada sin indicar el archivo de variables
- **THEN** una prueba falla y nombra la herramienta
