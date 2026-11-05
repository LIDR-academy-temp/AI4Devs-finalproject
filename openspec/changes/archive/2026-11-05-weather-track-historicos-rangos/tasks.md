# Tasks

## 1. API (D1, D2, D3)

- [x] 1.1 Escribir primero las pruebas parametrizadas de los límites del rango (primer día permitido, un instante antes, `hasta` en la tolerancia y fuera de ella, 29 de febrero) y luego la validación en `obtenerHistorico` con la hora de `Ahora`; verificar con `uv run pytest`
- [x] 1.2 Regenerar `openapi.json` y los tipos del frontend, y actualizar la sección 4 del README; verificar con `test_contrato_frontend.py`

## 2. Pantalla (D3, D4, D5)

- [x] 2.1 Reemplazar los botones por Día, Semana y Mes, y agregar el rango manual con dos calendarios limitados al último año y a hoy; verificar con pruebas de componentes los rangos pedidos, los títulos y cada error del rango manual sin consulta a la API

## 3. Integración

- [x] 3.1 Actualizar la E2E de HU3 con Semana, Mes y un rango manual, y verificar que pasa con las demás
- [x] 3.2 Actualizar F5 y HU3 del README y la guía de la demo, y verificar que ningún documento ofrece solo 7 y 31 días
- [x] 3.3 El responsable verifica los históricos en la aplicación local de revisión. Aprobada por el responsable el 5 de noviembre de 2026
