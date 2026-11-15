# Tasks

Las decisiones están en `design.md` (D1 a D5). Las pruebas usan una SAT2 falsa o el modo simulado; las verificaciones con Docker usan un proyecto aislado. El asistente nunca ejecuta el modo real: la verificación con los datos de SAT2 la hace el responsable.

## 1. Recuperación de huecos (D1, D2, D3)

- [x] 1.1 Crear la migración `0005` con el tipo de ejecución `RECUPERACION`, y verificar `upgrade` y `downgrade` sobre una base con datos, incluido el borrado de las ejecuciones de recuperación al revertir
- [x] 1.2 Escribir primero las pruebas de `recuperar_huecos` con una SAT2 falsa: hueco de varios días, hueco al principio y al final de la ventana, tramos de 30 minutos o menos que no cuentan, lecturas existentes sin duplicar, día terminado ya recuperado que no se repite, día en curso que sí, días agrupados en una consulta por sensor y humedades incoherentes marcadas; luego implementar `app/ingesta/recuperacion.py`
- [x] 1.3 Ejecutarla en la tarea horaria del worker después de la carga inicial, y verificar con una prueba que corre al arrancar y que el modo prueba no la ejecuta

## 2. Rangos de los históricos (D4, D5)

- [x] 2.1 Escribir primero las pruebas del límite de la API (1/10 a las 00:00 al 1/11 a las 23:59 se acepta; un minuto más de 32 días se rechaza) y luego cambiar `RANGO_MAXIMO`; actualizar la descripción del error en la sección 4 del README
- [x] 2.2 Escribir primero las pruebas de la pantalla: abre en Día, el rango manual del 1/10 al 1/11 se consulta y el del 1/10 al 2/11 se rechaza con un mensaje que da un ejemplo; luego cambiar `DetalleSensor.tsx` y `servicios/serie.ts`, y ajustar las pruebas de extremo a extremo que suponían Semana

## 3. Documentación

- [x] 3.1 Actualizar el README (1.6, 2.6 y lo que describa los rangos o la carga) y la hoja de ruta, y regenerar la guía de las especificaciones al archivar

## 4. Verificación del responsable

- [x] 4.1 El responsable levanta su instalación con el cambio y comprueba que se completan los días 1 al 9 de noviembre y que Día, Semana, Mes y el rango del 1/10 al 1/11 se ven completos; el asistente solo cuenta lecturas por día en la base local
- [x] 4.2 El responsable revisa el cambio y lo aprueba
