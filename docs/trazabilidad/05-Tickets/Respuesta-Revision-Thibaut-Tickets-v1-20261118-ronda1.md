# Respuesta a la revisión adversarial — Tickets v1, ronda 1

> Miércoles 18/11/2026. Informe revisado: `Revision-Thibaut-Tickets-v1-20261118-ronda1.md`
> (9 hallazgos y 2 sospechas). Resultado en `Tickets-MVP-Controlador-de-Tiempo-20261118-v2.md`.

**Resumen:** 9 hallazgos, los 9 ciertos · 7 corregidos en el documento · 2 son un riesgo ya
aceptado (D-48 y D-58) y se llevan a la especificación como obligación · ninguno descartado.
Las 2 sospechas se llevan también a la especificación. Suma: 7 + 2 = 9.

## Hallazgos

| # | Nivel | Qué decía | Qué se hizo | Dónde quedó |
|---|---|---|---|---|
| 1 | Crítico | Las pruebas de separación corren una vez; una tabla futura puede nacer sin organización | **Corregido.** Toda tabla de negocio nace con organización y regla, y entra a las pruebas en el mismo ticket; HU-03.3 recorre todas las tablas que existan, falla si alguna no cumple y corre en cada cambio. HU-03.CA-1 a CA-3 pasan a «en parte» | Sección 1 (Migración/DB y Test) · HU-03.3 · sección 4 |
| 2 | Alto | HU-02.4 prueba «lo construido hasta la fecha» y sus criterios se contaron como cubiertos | **Corregido.** La matriz crece con cada operación nueva, por Definition of Done. El conteo distingue completo, en parte y en espera: 56, 15 y 4 | Sección 1 (Endpoint/API) · HU-02.4 · sección 4 |
| 3 | Alto | H-1 exige una especificación ya aprobada, está tipado como Test y no espera a HU-01.6 | **Corregido.** Tipo nuevo «Especificación» con su Definition of Done; excepción escrita para H-1, H-2 y HU-01.6; H-1 depende de HU-01.6; HU-01.1 y HU-03.1 dependen de H-1. HU-01.6 deja de heredar criterios: comprueba si son alcanzables, no los hace verdad | Sección 1 · sección 2 · HU-01 · sección 5 |
| 4 | Alto | La ejecución recurrente no tiene sesión de usuario y la Definition of Done la exige | **Corregido.** Excepción escrita para HU-07.3: secreto propio y proceso organización por organización, con sus dos pruebas. El cómo va a la especificación (E-6) | Sección 1 · HU-07.3 · sección 8 |
| 5 | Alto | El correo solo tiene pruebas unitarias | **Corregido.** HU-07.8 nuevo: escenarios de punta a punta capturando el correo (CA 5, 6, 8, 10 y 12). Límite declarado: la entrega real se comprueba a mano en el despliegue. El caso «el servicio acepta y la confirmación no llega» no está en el backlog: va a la especificación (E-5) | HU-07.8 · sección 8 |
| 6 | Alto | «Mañana» y «día de desactivación» sin zona horaria | **Riesgo ya aceptado** (D-48, D-58). Obligación para la especificación: una sola regla de fecha por organización (E-1) | Sección 8 · límite declarado de H-3 |
| 7 | Medio | Fecha de la consulta con clientes en zonas distintas | **Riesgo ya aceptado**, la misma familia. Obligación para la especificación (E-2) | Sección 8 · límite declarado de H-3 |
| 8 | Medio | «Media jornada» frente a tres tickets L, y la talla no incluye la revisión | **Corregido.** Los tres L se partieron en dos (decisión de la Dirección, 18/11): HU-07.2 + HU-07.6, HU-07.4 + HU-07.7, HU-07.5 + HU-07.8. 30 tickets, ningún L. La talla mide construir; la revisión se cuenta aparte al planear y un tramo no termina con revisiones abiertas | Sección 1 · HU-07 · sección 6 |
| 9 | Medio | HU-10.CA-1 muestra el motivo y eso es de HU-08 | **Corregido.** HU-10.CA-1 pasa a «en parte»; mostrar el motivo es condición de aceptación de HU-08 | HU-10 · sección 4 |

## Sospechas

| # | Qué decía | Qué se hizo |
|---|---|---|
| 1 | El acceso no tiene ticket de integración con el servicio de autenticación | A la especificación (E-3). Si decide una capa propia, nace un ticket |
| 2 | No hay plan si el servicio no limita los intentos | A la especificación (E-4), con lo que salga de HU-01.6 |

## Lo que cambió además, sin que el informe lo pidiera

- **Un total equivocado de la versión 1.** La sección 7 decía que T-03 del README se convertía en
  «once tickets»; eran diez (5 + 3 + 2). Con once, la tabla sumaba 28 y no 27. La versión 2 trae
  la columna «Cuántos» y su suma, y el script la cruza.
- **Más criterios «en parte» de los que el informe nombró.** Al aplicar el hallazgo 2 con la misma
  regla a todo el documento salieron seis más: HU-02.CA-10 (registro y período propios), HU-03.CA-1
  a CA-3 (tablas futuras), HU-03.CA-4, HU-07.CA-12 y HU-07.CA-18 (los tres nombran el resumen
  final, que es de HU-09). Total: 15.
- **Los tramos son diez, no nueve.** Poner H-1 después de HU-01.6 agrega uno; partir el correo en
  tres tickets encadenados agrega otro.

## Propuesto en la versión 2 y sin decidir por la Dirección

1. El tipo nuevo «Especificación» y su Definition of Done.
2. La clasificación de HU-02.CA-9 como completo (el rechazo con mensaje se comprueba con una
   operación que sí existe, aunque los ejemplos del criterio sean operaciones futuras).
3. Que HU-07.5 ya no dependa del correo (antes dependía de HU-07.4).
4. La dependencia nueva de HU-07.6 sobre HU-06.3 y de HU-10.1 sobre HU-07.6.

## Verificación

Cruce automático sobre la versión 2 y el backlog v5: 30 tickets (27 + 3) · 9 S, 21 M, 0 L ·
10 tramos (2, 1, 2, 5, 6, 4, 3, 4, 2, 1), iguales a los niveles calculados · sin ciclos · 50
dependencias, las mismas en las tablas y en el diagrama · 75 criterios: 56 completos, 15 en parte,
4 en espera · ningún criterio sin ticket ni heredado sin existir. Resultado: coherente.
