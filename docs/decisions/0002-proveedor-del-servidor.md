---
status: proposed
date: 2026-11-02
decision-makers: Pablo Guillermo Di Nanno
consulted: Claude (asistente de IA, Claude Code)
informed: Evaluadores de AI4Devs
---

# ADR-0002: Instalación local como entrega y Google Cloud como despliegue público

| | |
|---|---|
| **Estado** | Propuesto. La instalación local se aplica desde ya. El responsable eligió Google Cloud el 2 de noviembre de 2026 para el despliegue público, pero **lo pospuso ese mismo día**: se retomará después de la Entrega 2, con más datos que aportará. Entonces se confirmarán o se ajustarán el servicio, la región y el tamaño que propone este ADR. |
| **Alcance** | Actividad A13 del [plan](../plan/plan-implementacion-entrega-2.md). |
| **Fuera de alcance** | Pipeline de entrega continua, alta disponibilidad y el servidor definitivo de producción empresarial. |

## Contexto y problema

El [ADR-0001](0001-arquitectura-destino-weather-track.md) define un monolito modular con worker dedicado, PostgreSQL y Caddy sobre Docker Compose. Faltaba decidir dónde corre. Hay dos necesidades distintas:

1. **Instalación local.** Cualquier persona debe poder llevar la aplicación desde el repositorio de GitHub hasta su computadora. Es parte de la entrega final y no puede depender de una cuenta en la nube.
2. **Despliegue público (opción plus).** Weather Track debe poder visitarse desde internet con el dominio del responsable.

## Decisión propuesta

- **Local:** Docker Compose, con la [guía de instalación local](../despliegue/instalacion-local.md). Es el camino que se entrega y se evalúa.
- **Público:** una máquina virtual **`e2-small` de Compute Engine en Santiago (`southamerica-west1`)**, con la misma pila de Compose, sumando [`docker-compose.prod.yml`](../../docker-compose.prod.yml). Pasos en la [guía de despliegue en GCP](../despliegue/despliegue-gcp.md).
- **Dominio:** un subdominio con un registro `A` directo a la IP fija. Caddy obtiene el certificado de Let's Encrypt.

## Requisitos del despliegue público

- **Procesos permanentes.** El worker corre siempre, así que un servicio que se apaga por inactividad no sirve.
- **Volumen persistente** para PostgreSQL y para los certificados.
- **IP pública fija y puertos 80 y 443**, para Caddy.
- **Memoria.** La pila completa usó unos 280 MiB con 31 días de datos simulados de una estación (medido el 2 de noviembre de 2026), así que 2 GB dejan margen. La compilación de imágenes puede exigir más: por eso la guía agrega memoria de intercambio.
- **Cercanía a Argentina**, porque los usuarios consultan desde el campo y con conexiones móviles.

## Opciones consideradas dentro de Google Cloud

| Opción | Evaluación |
|---|---|
| **Compute Engine con Docker Compose** | **Elegida.** Es la misma pila que se prueba y se entrega en local, sin cambios de código. Mudarla a otro servidor es copiar la base y el `.env`. |
| Cloud Run con Cloud SQL | Descartada. El worker exige CPU siempre activa y una sola instancia, que es justo lo que este servicio no prioriza, y Cloud SQL agrega un costo fijo. Obligaría a mantener dos formas de ejecutar el sistema, contra lo que busca el ADR-0001. |
| GKE (Kubernetes) | Descartada. Es desproporcionada para cuatro contenedores en un MVP. |
| `e2-micro` del nivel gratuito | Descartada. Solo existe en regiones de Estados Unidos, tiene menos memoria y duplica la latencia medida. |

### Región

Latencia mínima medida desde la computadora del responsable, en Argentina, el 2 de noviembre de 2026, con 5 consultas por región a los puntos de [GCPing](https://gcping.com):

| Región | Latencia |
|---|---|
| **Santiago, `southamerica-west1`** | **80 ms** |
| São Paulo, `southamerica-east1` | 91 ms |
| Carolina del Sur, `us-east1` | 195 ms |
| Iowa, `us-central1` | 237 ms |
| Fráncfort, `europe-west3` | 289 ms |

Es una sola medición, desde una sola conexión: sirve para ordenar regiones, no como garantía.

### Costo estimado

| Concepto | Por mes, sin impuestos | Origen |
|---|---|---|
| `e2-small` en Santiago | Cerca de 17,50 USD | [gcloud-compute.com](https://gcloud-compute.com/e2-small.html), actualizado el 1 de noviembre de 2026. **No es la fuente oficial**, y otros sitios dan valores distintos |
| IP externa | Cerca de 3,65 USD | Conocimiento general, sin confirmar en la página oficial |
| Disco de 30 GB y copias | Pocos dólares | Sin confirmar |
| **Total** | **Del orden de 25 USD** | Estimación que se debe confirmar en la [calculadora de Google](https://cloud.google.com/products/calculator) |

El [crédito de prueba](https://docs.cloud.google.com/free/docs/free-cloud-features) de 300 USD por 90 días cubre las entregas de noviembre y diciembre. Al terminar, Google detiene los recursos si no se pasa a una cuenta paga.

### Alternativa fuera de Google Cloud

[AWS Lightsail en São Paulo](https://aws.amazon.com/lightsail/pricing/), con 2 vCPU y 2 GB, cuesta 12 USD por mes y fue la primera recomendación. Es cerca de la mitad del costo estimado, y queda como alternativa: la pila no depende del proveedor.

## Consecuencias

**Positivas:**

- La entrega no depende de la nube: quien evalúa puede instalarla sin cuenta ni costo.
- Local y nube corren la misma pila, así que lo probado en local vale en el servidor.
- El subdominio no afecta al sitio que ya exista en el dominio principal.

**Negativas:**

- Cuesta más que un servidor virtual simple, y el costo real se debe vigilar con una alerta de presupuesto.
- Terminada la prueba de 90 días, mantenerlo en línea tiene un costo mensual.
- Una sola máquina virtual es un punto único de falla, como aceptó el ADR-0001.

**Riesgo por confirmar:** no se sabe si SAT2 acepta conexiones desde una IP de Google en Chile. La guía lo comprueba antes de crear cuentas. Si las rechazara, habría que consultar a TECMES.

## Confirmación

Se cumple cuando:

- Una persona llega a la aplicación con datos de demostración siguiendo la guía local desde un `git clone` del repositorio publicado.
- Sobre la máquina virtual se verifican por HTTPS el acceso, la recomendación y un ciclo real del worker (tarea 11.2 de OpenSpec).

## Más información

- [Crédito de prueba y nivel gratuito de Google Cloud](https://docs.cloud.google.com/free/docs/free-cloud-features)
- [Precios de `e2-small` por región, gcloud-compute.com](https://gcloud-compute.com/e2-small.html)
- [Precios de AWS Lightsail](https://aws.amazon.com/lightsail/pricing/)
