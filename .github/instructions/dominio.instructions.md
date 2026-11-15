---
applyTo: "backend/app/dominio/**"
---

# Revisión del dominio: motor TIS, reglas R1 a R4, normalización y vigencia

Este código decide si se puede aplicar. Tratar cualquier cambio de resultado como **Bloqueante** hasta que las pruebas lo justifiquen.

- **Versión del método.** Si cambia un peso, un corte o un umbral del índice TIS en `motor_tis.py` y no cambia `VERSION_METODO`, señalarlo: cada recomendación guarda la versión con la que se calculó.
- **Límites.** Revisar cada comparación con un umbral. ¿Es "menor o igual" o "menor"? ¿Coincide con la especificación `application-recommendation` y con los casos de referencia de las pruebas? Pedir un caso de prueba exactamente en el límite si falta.
- **Un único lugar por umbral.** La antigüedad máxima de 30 minutos vive en `vigencia.py`; los cortes del índice, en `motor_tis.py`. Señalar un número repetido en otro archivo.
- **Vigencia al leer.** La regla R2 se aplica al leer, no al guardar. Señalar código que descarte o marque lecturas viejas al guardarlas.
- **Sin dependencias de otras capas.** El dominio no importa nada de `app.api`, `app.ingesta` ni `app.datos`, ni hace E/S (base, red, archivos, reloj del sistema). La hora actual entra como parámetro. Lo controla `tests/test_arquitectura.py`, pero conviene señalarlo antes.
- **Unidades métricas.** Velocidad en km/h, temperatura en °C, radiación en W/m². Señalar una conversión a millas por hora o una unidad sin indicar.
- **Datos faltantes o sospechosos.** Ninguna rama debe devolver un estado favorable con un dato faltante, viejo o sospechoso, ni con inversión térmica.
- **Pesos y cortes no validados.** Si un comentario o un texto presenta los pesos o los cortes como validados por la bibliografía, señalarlo: la bibliografía respalda las variables, no sus valores.
- **Cobertura.** El pipeline exige 100 % de líneas en `app.dominio`. Una línea nueva necesita una prueba.
