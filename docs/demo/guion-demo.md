# Guion de la demostración

Muestra el flujo principal de Weather Track en unos 7 minutos, sobre la [instalación local](../despliegue/instalacion-local.md). Usa datos ficticios, sin credenciales ni conexión a SAT2.

El modo de demostración habitual siempre da "Apto". Esta demo usa el modo `escenarios`: una estación ficticia por cada caso. Los estados no están forzados: los calculan el ciclo y el motor reales a partir de lo que entrega la fuente simulada.

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

Editar `.env` así:

| Variable | Valor |
|---|---|
| `SAT2_MODO` | `escenarios` |
| `CARGA_PAUSA_SEGUNDOS` | `0`. Hay que agregar esta línea |

```bash
docker compose up --build -d --wait
```

```bash
docker compose exec api python -m app.semillas
```

Ese último comando muestra el correo y la clave de demostración. Esperar un minuto, para que se carguen los históricos, y abrir <http://localhost:8080>.

## Guion

| Min. | Dónde | Qué mostrar | Qué decir |
|---|---|---|---|
| 0:00 | Acceso | Ingresar con la cuenta de demostración | "¿Puedo aplicar ahora sin riesgo de deriva?" No hay registro público, y las cuentas las crea un administrador |
| 0:30 | Lista de estaciones | Las estaciones asignadas | Cada persona ve solo las suyas, y el servidor lo comprueba en cada consulta |
| 1:00 | **Condiciones favorables** | "Apto para aplicar", índice, diferencia térmica, hora, motivos y aviso | El estado no depende solo del color: lleva texto e ícono. La recomendación siempre es orientativa |
| 1:30 | Misma pantalla | Tarjetas de sensores, incluidas "Sin dato válido" y "En alarma" | Cada lectura informa su calidad. Se actualiza sola cada minuto |
| 2:00 | **Inversión con índice bajo** | "Precaución" con índice bajo | Regla R3: el índice solo daría apto, pero una inversión nunca lo es |
| 2:30 | **Inversión con poco viento** | "No aplicar", con la inversión y el viento en los motivos | Regla R3b: sin viento no hay mezcla de aire |
| 3:00 | **Índice elevado** | "Riesgo de deriva" | Calma, sin sol y mucha humedad: el índice sube aunque no haya inversión |
| 3:30 | **Lectura faltante** | "Datos insuficientes", sin índice, y el sensor afectado | Regla R1: sin las seis lecturas no se calcula nada |
| 4:00 | **Datos desactualizados** | "Datos insuficientes", con la antigüedad | Regla R2: un dato viejo nunca se muestra como vigente |
| 4:30 | **Lectura sospechosa** | "Precaución" y tarjetas marcadas | Regla R4: humedades incoherentes entre 2 m y 10 m. **Es lo que hoy ocurre en la estación real** |
| 5:00 | **Fuente caída** | Aviso "Sin conexión con la fuente de datos" | El sistema distingue una falla de la fuente de la falta de datos |
| 5:30 | **Con históricos**, tocar *Temp Amb. a 2 Mts* | Gráfico y resumen; cambiar a 31 días | La línea se corta en los huecos, sin inventar datos |
| 6:15 | `http://localhost:8080/estaciones/10` | "No tiene acceso a esta estación." | Es la estación ajena: no alcanza con conocer el enlace |
| 6:30 | Herramientas del navegador, ancho 360 | La pantalla de decisión | Pensada para usarse en el lote, con el celular |
| 6:45 | Salir | Cerrar sesión | La sesión se invalida en el servidor |

## Si preguntan

- **¿Y con datos reales?** El worker ya se probó contra SAT2 durante 38 minutos, con 48.427 lecturas. Hoy la estación real no llega a "Apto", porque el sensor de humedad a 2 m informa 0 % y la regla R4 lo impide. El sistema está haciendo lo que debe.
- **¿El índice está validado?** Todavía no. La bibliografía respalda las variables, pero no los pesos ni los cortes: ver el [contraste bibliográfico](../tis/contraste-bibliografico.md). La validación agronómica es para la Entrega 3.
- **¿Está en internet?** Todavía no: el despliegue público está pospuesto ([ADR-0002](../decisions/0002-proveedor-del-servidor.md)).

## Al terminar

```bash
docker compose down -v
```

Ese comando borra los datos de la demostración.
