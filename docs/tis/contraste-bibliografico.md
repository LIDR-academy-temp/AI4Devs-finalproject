# Contraste del índice TIS con su bibliografía

| | |
|---|---|
| **Método evaluado** | `TIS-1.0`. El vigente es `TIS-1.1`, que agrega la regla R3b; ver la sección 1.2 del [README](../../readme.md) |
| **Fecha** | 1 de noviembre de 2026 |
| **Alcance** | Lectura de los cuatro documentos citados por el prototipo. No reemplaza una validación agronómica ni una comparación con datos de campo. |

## Conclusión

**El TIS es un índice propio, no un método publicado.** La bibliografía respalda las variables que usa y la regla de fondo, que es evitar aplicar durante una inversión. En cambio, **ningún documento contiene sus pesos (50/25/15/10), sus escalas ni sus cortes de 20, 40 y 60.** Por eso debe presentarse como un criterio operativo inspirado en la literatura, y su carácter orientativo es obligatorio.

## Documentos revisados

| Referencia | Qué aporta |
|---|---|
| Huang, Fisher, Silva y Thomson (2019). *Applied Engineering in Agriculture*, 35(1), 31-38 | Herramienta web basada en la evolución de la temperatura durante el día y en el viento; relación de estabilidad (SR) |
| Nowatzki (revisado en 2022). NDSU Extension, AE1876 | Definición, efecto del viento y recomendación de evitar aplicar |
| Thostenson (2019). NDSU Extension, presentación | Factores que agravan una inversión, horarios y umbrales prácticos |
| *Air Temperature Inversions*, sin autor ni fecha en el archivo | Etiquetas de productos y observaciones de red de estaciones |

## Comparación por componente

| Componente de `TIS-1.0` | Qué dice la bibliografía | Evaluación |
|---|---|---|
| ΔT > 0 como inversión | Existe inversión si el aire de abajo está más frío; a mayor diferencia, más intensa (Nowatzki) | **Respaldado** |
| ΔT ≥ 3 °C como máximo | Solo aparece "0,5 grados, preocuparse; 1,0 o más, muy serio", sin unidad y en otro contexto (Thostenson, p. 50). Las estaciones de NDSU informan en °F y miden entre 1 y 3 m | **Sin respaldo; parece permisivo** |
| Mayor riesgo con menos viento | Coincide con todas las fuentes | **Respaldado** |
| Escala del viento | Referencias: 3 mph (4,8 km/h), 4 mph (6,4 km/h), 5 mph (8 km/h) y 2 m/s (7,2 km/h). Hay inversiones significativas aun con 6 mph (9,7 km/h) | **Forma compatible; valores sin respaldo directo** |
| Mayor riesgo con menos radiación | Las inversiones se forman al enfriarse la superficie, con cielo despejado. Pero un día nublado también tiene poca radiación y **reduce** la inversión | **Parcial: es un indicador indirecto** |
| Mayor riesgo con más humedad | Con **poca** humedad la inversión se forma más rápido y es más intensa (Thostenson, p. 23 y 26). La humedad muy alta o la niebla son señal de alerta e impiden evaporar (Nowatzki) | **Respaldo débil y dirección discutible** |
| Pesos y cortes | No aparecen en ningún documento | **Sin respaldo** |
| Regla R3: una inversión nunca es apta | Evitar aplicar durante una inversión (Nowatzki); algunas etiquetas lo prohíben | **Respaldada, pero quizá insuficiente** |

## Hallazgos que afectan a la decisión

### 1. `PRECAUCION` puede quedarse corto con inversión y poco viento

Huang et al. (tabla 2) solo admiten aplicar con una inversión muy leve si el viento supera 4 mph, y si no lo supera indican no aplicar. Con `TIS-1.0` esta situación no llega a `NO_APLICAR`:

| ΔT | Viento | Radiación | Humedad | Índice | Estado actual | Según Huang et al. |
|---|---|---|---|---|---|---|
| +0,5 °C | 2 km/h | 600 W/m² | 50 % | 32,83 | `PRECAUCION` | No aplicar |
| +1,0 °C | 3 km/h | 600 W/m² | 50 % | 41,17 | `RIESGO_DERIVA` | No aplicar |

**Decisión:** se incorporó la regla R3b en `TIS-1.1`: si ΔT > 0 y el viento es de 6,4 km/h (4 mph) o menos, el estado es `NO_APLICAR`. El responsable la aprobó el 1 de noviembre de 2026. Como la cifra se publicó con mediciones a otras alturas, también debe revisarse en la validación agronómica.

### 2. El horario no se considera

Las fuentes coinciden en que las inversiones suelen formarse antes del atardecer y disiparse después del amanecer. Algunas etiquetas limitan la aplicación a la franja de una hora después del amanecer a dos horas antes del atardecer. `TIS-1.0` no usa la hora, aunque sí mide la inversión de forma directa. Queda como evolución, y el aviso de la pantalla remite a la etiqueta del producto.

### 3. Existe un método publicado que se podría comparar

La relación de estabilidad de Huang et al. es `SR = (T2 − T1) / WS² × 10⁵`, con temperatura en °C y viento en cm/s, y clasifica como estable de 0,1 a 1,2 y como muy estable de 1,2 a 4,9. Por ejemplo, con ΔT = +0,9 °C y viento de 13 km/h, SR ≈ 0,69, es decir, **estable**, cuando `TIS-1.0` da un índice de 20.

Conviene compararla con datos reales. Se publicó con mediciones a 4,6 y 9 m, y la estación mide a 2 y 10 m, así que no se puede trasladar sin más.

### 4. Las alturas no son las mismas

NDSU mide entre 1 y 3 m, Huang et al. entre 4,6 y 9 m, y la estación entre 2 y 10 m. Una misma diferencia de temperatura no significa lo mismo en cada caso, por lo que ningún umbral es directamente transferible.

## Referencias del prototipo

- **Se confirman en los archivos:** Huang et al. (2019), Nowatzki (AE1876, revisado en agosto de 2022) y Thostenson (2019).
- **No están en la carpeta revisada:** el material de GRDC solo figura como enlace en una lista de citas.
- **Frase a revisar:** el prototipo dice "Implementación basada en literatura científica". Es más exacto "inspirada en", porque los pesos y los cortes son propios.

## Próximos pasos

1. Comparar `TIS-1.1` y SR con el histórico real de la estación.
2. Revisar con un referente agronómico los pesos, los cortes y la dirección del factor de humedad.
3. Evaluar la franja horaria como regla adicional.
