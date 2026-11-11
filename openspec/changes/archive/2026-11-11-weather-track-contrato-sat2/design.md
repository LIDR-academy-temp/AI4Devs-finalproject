# Design

## Context

- `ClienteSat2Http` (`app/ingesta/cliente_sat2.py`) usa cuatro métodos de SAT2: `AutenticarUsuario`, `RecuperarEquipos`, `RecuperarInstantaneosDeEquipo` y `RecuperarHistoricosDeEquipoPorSensor`.
- La SAT2 simulada lee `app/ingesta/datos_simulados/catalogo.json` e `instantaneos.json`, armados a mano a partir de la documentación privada de SAT2, que no se versiona.
- El worker toma la configuración de SAT2 de la base o del `.env` con `OrigenSat2` (`app/ingesta/origen_sat2.py`). Solo el worker tiene la clave privada.
- La imagen del backend copia `app` y `herramientas`, pero no `tests`.
- Reglas: el asistente no se autentica en SAT2 ni ejecuta el modo real, y el repositorio público no lleva la URL, credenciales, tokens ni datos de la cuenta.

## Goals / Non-Goals

**Goals:**

- Que las pruebas usen la forma real de las respuestas de SAT2.
- Detectar un cambio de SAT2 antes de que se vea como datos faltantes.
- Que nada sensible llegue a la terminal, a un archivo ni al repositorio.

**Non-Goals:**

- Reemplazar la SAT2 simulada del modo `simulado`: sigue igual.
- Comparar automáticamente desde el worker o el pipeline. El pipeline no tiene credenciales, por regla. Queda como mejora posible.

## Decisions

### D1. La captura corre en el worker del responsable

```bash
docker compose exec -T worker python -m herramientas.capturar_sat2 --salida /tmp/respuestas.json
docker compose cp worker:/tmp/respuestas.json backend/tests/datos_sat2/respuestas.json
```

- La herramienta escribe el archivo **dentro del contenedor**, en UTF-8, y `docker compose cp` lo copia sin cambiarlo. No se redirige la salida estándar: en Windows PowerShell 5.1, `>` guarda el texto en UTF-16 y puede alterar los acentos y el símbolo de grados.
- La carpeta `backend/tests/datos_sat2/` se crea en el grupo 1, con un `README.md` que explica de dónde salen las respuestas, cómo se sanean y cómo se vuelven a capturar. Así existe antes de la copia.

- Solo corre con `SAT2_MODO=real`. En otro modo termina con un mensaje y sin consultar nada.
- Usa `OrigenSat2`, así que toma la configuración cargada en «Administración» o el `.env`, igual que el worker.
- Pide, en este orden, con la pausa de la carga inicial entre consultas:
  1. la autenticación;
  2. los equipos;
  3. los instantáneos del equipo 1;
  4. los históricos de cada sensor del equipo 1 para el día anterior completo, en hora de Argentina.

  Son unas 13 consultas.
- `ClienteSat2Http` recibe un parámetro opcional `observar(metodo, datos)` que la herramienta usa para guardar cada respuesta decodificada. Sin ese parámetro, el cliente funciona como hoy.
- Escribe **solo el JSON saneado**, en el archivo de `--salida`. En la terminal informa cuántas respuestas guardó y qué rutas saneó, sin valores.

### D2. Saneado

`sanear(datos)` recorre la respuesta y devuelve una copia con la misma estructura:

- **Por clave:** si el nombre de la clave contiene, sin distinguir mayúsculas, `token`, `clave`, `password`, `usuario`, `cliente`, `mail`, `correo` o `serie`, el valor se reemplaza: los textos por `"<redactado>"` y los números por `0`. Se conserva el tipo para que la forma no cambie.
- **Por valor:** cualquier otro texto con forma de URL (`http://`, `https://` o `www.`), de correo (`algo@algo.algo`) o de token (24 caracteres o más, sin espacios, de letras, números, `.`, `_`, `-`, `+`, `/` o `=`) también se reemplaza.
- Se conservan las descripciones de los equipos, las coordenadas, los nombres y las unidades de los sensores, las fechas y los valores. Son datos de la estación pública de INTA Pergamino, que la aplicación ya muestra.
- Devuelve también la lista de rutas reemplazadas, por ejemplo `AutenticarUsuario.token` o `RecuperarEquipos[0].NroSerie`.

El archivo incluye la fecha de captura y la versión de la herramienta. No incluye el identificador del cliente ni ningún encabezado HTTP.

### D3. Revisión antes de versionar

1. El responsable captura en su computadora.
2. Una prueba (`test_las_respuestas_no_tienen_secretos`) busca en el archivo URL, correos y textos con forma de token. Si encuentra algo, falla y nombra la ruta, sin mostrar el valor.
3. Con esa prueba en verde, el asistente lee el archivo saneado y resume para el responsable qué contiene.
4. El responsable lo revisa y aprueba el commit.

Gitleaks también lo escanea en el pipeline.

### D4. Pruebas de contrato

`tests/test_contrato_sat2.py` usa un cliente falso que devuelve las respuestas versionadas, con la base de pruebas:

- **Catálogo:** `sincronizar_catalogo` crea la estación y todos sus sensores, cada uno con una magnitud y una unidad del sistema de Weather Track. Ningún sensor queda sin clasificar.
- **Ciclo:** `ejecutar_ciclo` con los instantáneos reales termina en `EXITO` y calcula una recomendación con un estado válido.
- **Históricos:** la carga de cada sensor interpreta todas las fechas del día, sin lecturas descartadas por formato.
- **Sin secretos:** la prueba de D3.

### D5. Forma de referencia y comparación

`forma(datos)` describe una respuesta sin sus valores: para un objeto, sus claves con la forma de cada valor; para una lista, la forma combinada de sus elementos; para lo demás, el tipo (`texto`, `numero`, `booleano` o `nulo`). Enteros y decimales son el mismo tipo: JSON escribe `0` o `0.0` según el valor, y separarlos daría falsas alarmas. Se guarda en `herramientas/forma_sat2.json`, dentro de la imagen, para que `--comparar` funcione en el worker.

```bash
docker compose exec -T worker python -m herramientas.capturar_sat2 --comparar
```

- Vuelve a pedir las mismas respuestas, calcula su forma y la compara con la de referencia.
- Lista las claves nuevas, las que faltan y los tipos que cambiaron, con su ruta y sin valores.
- Termina con código 1 si hay diferencias. No escribe ningún archivo.

Una prueba comprueba que `forma_sat2.json` coincide con la forma de las respuestas versionadas, y otra que la comparación detecta claves nuevas, faltantes y cambios de tipo.

## Risks / Trade-offs

- [Un dato sensible con una clave inesperada] → El saneado por valor cubre URL, correos y tokens. La prueba de D3 y la revisión del responsable son la segunda y la tercera barrera.
- [SAT2 cambia y nadie corre la comparación] → Un cambio que rompa el procesamiento igual aparece como ciclo en error en la pantalla de administración. La comparación anticipa los cambios que todavía no rompen.
- [Las respuestas de referencia envejecen] → Se vuelven a capturar cuando la comparación encuentra diferencias. El archivo dice cuándo se capturó.

## Migration Plan

1. Se implementan la herramienta y sus pruebas con valores ficticios.
2. El responsable captura en su instalación, con la imagen reconstruida.
3. Se versionan las respuestas y la forma, y se agregan las pruebas de contrato.

Sin cambios en la base de datos. **Vuelta atrás:** se borran la herramienta y los archivos.

## Open Questions

Ninguna.
