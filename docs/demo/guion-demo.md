# Guion de la demostración

Muestra el flujo principal de Weather Track en unos 7 minutos, sobre la [instalación local](../despliegue/instalacion-local.md). Usa datos ficticios, sin credenciales ni conexión a SAT2.

La demo usa el modo `prueba`. El selector muestra dos casos: "Caso de prueba - 1", donde se cargan las situaciones, y "Caso de prueba - 2", sin lecturas. Ninguna situación se presenta como estación: una estación es solo un equipo de SAT2.

Antes de cada paso del guion, una terminal carga la situación en el caso 1. Los estados no están forzados: los calculan el ciclo y el motor reales a partir de lo que entrega la fuente simulada.

```bash
docker compose exec api python -m herramientas.situaciones indice_elevado
```

La pantalla se actualiza sola cada minuto; para verlo enseguida, se recarga la página. `--lista` muestra todas las situaciones.

## Preparación (unos 5 minutos, antes de presentar)

Si ya hay una instalación de demostración, primero hay que borrarla con `docker compose down -v`. **Ese comando borra todos los datos de esa instalación**, así que no debe usarse sobre una instalación con datos reales.

```bash
git clone -b feature/entrega-2-PDN https://github.com/dinannopabloguillermo/AI4Devs-finalproject-temp.git weather-track
```

```bash
cd weather-track
```

```bash
cp .env.example .env
```

En `.env`, cambiar `SAT2_MODO` a `prueba`. El sistema carga solo los 31 días simulados del caso 1 antes de quedar listo.

```bash
docker compose up --build -d --wait
```

```bash
docker compose exec api python -m app.semillas
```

Ese último comando muestra el correo y la clave de demostración. Abrir <http://localhost:8080>.

## Guion

| Min. | Situación cargada | Dónde | Qué mostrar | Qué decir |
|---|---|---|---|---|
| 0:00 | `favorables` | Acceso | Ingresar con la cuenta de demostración | "¿Puedo aplicar ahora sin riesgo de deriva?" |
| 0:30 | | Selector del encabezado | Los dos casos de prueba y la franja "Modo de prueba" | Una estación es un equipo de SAT2; en la instalación real aparece INTA Pergamino. El selector está siempre, aunque haya una sola |
| 1:00 | | **Caso de prueba - 1** | "Apto para aplicar", índice, diferencia térmica, hora, motivos y aviso | El estado no depende solo del color: lleva texto e ícono. La recomendación siempre es orientativa |
| 1:30 | | Misma pantalla | Tarjetas de sensores, incluidas "Sin dato válido" y "En alarma" | Cada lectura informa su calidad. Se actualiza sola cada minuto |
| 2:00 | `inversion_indice_bajo` | Caso 1 | "Precaución" con índice bajo | Regla R3: el índice solo daría apto, pero una inversión nunca lo es |
| 2:30 | `inversion_poco_viento` | Caso 1 | "No aplicar", con la inversión y el viento en los motivos | Regla R3b: sin viento no hay mezcla de aire |
| 3:00 | `indice_elevado` | Caso 1 | "Riesgo de deriva" | Calma, sin sol y mucha humedad: el índice sube aunque no haya inversión |
| 3:30 | `lectura_faltante` | Caso 1 | "Datos insuficientes", sin índice, y el sensor afectado | Regla R1: sin las seis lecturas no se calcula nada |
| 4:00 | `desactualizada` | Caso 1 | "Datos insuficientes", con la antigüedad | Regla R2: un dato viejo nunca se muestra como vigente |
| 4:30 | `sospechosa` | Caso 1 | "Precaución" y tarjetas marcadas | Regla R4: humedades incoherentes entre 2 m y 10 m. **Es lo que hoy ocurre en la estación real** |
| 5:00 | `fuente_caida` | Caso 1 | Aviso "Sin conexión con la fuente de datos" | El sistema distingue una falla de la fuente de la falta de datos |
| 5:30 | `con_historicos` | Caso 1, tocar *Temp Amb. a 2 Mts* | Gráfico y resumen; cambiar a Mes y luego **Elegir fechas** | La línea se corta en los huecos, sin inventar datos. El calendario llega hasta un año atrás, sin fechas futuras |
| 6:15 | | **Caso de prueba - 2**, desde el selector | "Datos insuficientes", sin mediciones | Un equipo sin lecturas nunca muestra una recomendación. Si un equipo deja de llegar de SAT2, queda como "Equipo inactivo - solo históricos" |
| 6:30 | | Herramientas del navegador, ancho 360 | La pantalla de decisión | Pensada para usarse en el lote, con el celular |
| 6:45 | | Salir | Cerrar sesión | La sesión se invalida en el servidor |

## Cuentas, si hay tiempo (2 minutos)

Se puede mostrar antes de empezar o al final, en otra pestaña:

1. En la pantalla de acceso, **Crear una cuenta**: nombre, apellido, correo, una contraseña de al menos 15 caracteres, localidad y provincia, y aceptar los términos.
2. Abrir <http://localhost:8025>, el Mailpit local: llegó el correo de confirmación, con la leyenda para darse de baja. Ningún correo sale a internet.
3. Abrir el enlace: la cuenta queda confirmada y la dirección ya no muestra el código. Ingresar.
4. **Mi cuenta**, en el encabezado: corregir un dato, cambiar la contraseña o darse de baja, que borra la cuenta con todos sus datos.

Qué decir: la cuenta del sitio no tiene relación con la cuenta de SAT2, que solo usa el servidor; quien no confirma en 48 horas se borra.

## Si preguntan

- **¿Y con datos reales?** El worker ya se probó contra SAT2 durante 38 minutos, con 48.427 lecturas. Hoy la estación real no llega a "Apto", porque el sensor de humedad a 2 m informa 0 % y la regla R4 lo impide. El sistema está haciendo lo que debe.
- **¿El índice está validado?** Todavía no. La bibliografía respalda las variables, pero no los pesos ni los cortes: ver el [contraste bibliográfico](../tis/contraste-bibliografico.md). La validación agronómica es para la Entrega 3.
- **¿Está en internet?** Todavía no: el despliegue público está pospuesto ([ADR-0002](../decisions/0002-proveedor-del-servidor.md)).
- **¿Quién puede crear una cuenta?** Cualquiera, con un correo propio que confirme. Las cuentas confirmadas forman la base de clientes, que el administrador exporta a CSV.

## Al terminar

```bash
docker compose down -v
```

Ese comando borra los datos de la demostración.
