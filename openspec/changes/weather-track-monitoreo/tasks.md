# Tasks

Las decisiones están en `design.md` (D1 a D6). Las verificaciones con Docker usan un proyecto aislado en modo simulado o prueba. El asistente no usa la instalación real del responsable.

## 1. Controles y alertas (D2, D3)

- [x] 1.1 Crear la migración `0006` con `alerta_sistema` y su restricción única parcial, y verificar `upgrade` y `downgrade`
- [x] 1.2 Escribir primero las pruebas parametrizadas de cada control con sus límites (30 minutos exactos y 31; 2 y 3 ciclos fallidos; 10 % libre y menos; 19 y 20 ingresos fallidos; IP en su límite), y la omisión de la ingesta en modo prueba; luego implementar `app/monitoreo/controles.py` y `umbrales.py`
- [x] 1.3 Escribir primero las pruebas de las transiciones: abrir, no repetir, cerrar, un objeto por estación, correos a los administradores activos sin datos personales; luego implementar `app/monitoreo/alertas.py` y el correo `ALERTA_SISTEMA`
- [x] 1.4 Evaluar los controles en el worker después de cada ciclo, montar el volumen de la base en modo solo lectura y verificarlo con pruebas del worker y de Compose

## 2. Pantalla (D4)

- [x] 2.1 Escribir primero las pruebas de `GET /api/v1/administracion/estado` (404 para el resto, controles, worker activo o sin actividad, últimas 20 alertas) y luego implementarla; regenerar el contrato y los tipos
- [x] 2.2 Agregar «Estado del sistema» a la pantalla de administración, con pruebas en Vitest

## 3. Métricas, Prometheus y Grafana (D5, D6)

- [x] 3.1 Escribir primero las pruebas de las métricas (nombres, etiquetas, valores, ningún dato personal) y luego publicarlas en el worker con `prometheus-client`
- [x] 3.2 Agregar el perfil `monitoreo` con Prometheus y Grafana, sus imágenes fijadas y la configuración en `monitoreo/` (Prometheus, fuente de datos, tablero y regla de worker caído); verificar con pruebas de Compose que Grafana solo escucha en la computadora local, exige su contraseña y no admite acceso anónimo, que Prometheus y el worker no publican puertos, y que el tablero y la regla son JSON y YAML válidos
- [x] 3.3 Levantar el perfil en un proyecto aislado: Prometheus toma las métricas, el tablero muestra datos, y al detener el worker Grafana envía el aviso a Mailpit

## 4. Seguridad y extremo a extremo

- [x] 4.1 Sumar a las pruebas negativas que `/metrics` no se alcanza por el proxy, que la ruta de estado responde 404 al resto y que una ráfaga de ingresos fallidos abre `FUERZA_BRUTA` una sola vez
- [x] 4.2 Sumar una prueba de extremo a extremo: el administrador ve «Estado del sistema» en verde

## 5. Documentación

- [x] 5.1 Escribir el ADR-0005 sobre el monitoreo y actualizar el README, la guía de instalación (perfil `monitoreo` y variables), el informe de seguridad, `CLAUDE.md`, las instrucciones de revisión si hace falta y la hoja de ruta (línea C)
- [ ] 5.2 El responsable levanta el perfil en su instalación, revisa el tablero y los avisos, y aprueba el cambio
