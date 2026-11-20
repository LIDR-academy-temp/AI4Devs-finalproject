// Rate limiting en memoria, por proceso: suficiente para el MVP de un único
// servidor Next.js (local o un dyno), pero no se comparte entre instancias en
// un despliegue serverless/multi-réplica. Documentado como limitación conocida
// en readme.md § 2.5 — para producción real habría que moverlo a Redis/Upstash.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Poda perezosa: en cada llamada hay una probabilidad baja de barrer buckets
// vencidos, para que el Map no crezca sin límite si alguien rota claves
// (IPs/emails falsos) para generar muchas entradas distintas.
function pruneExpiredBuckets(now: number): void {
  if (Math.random() >= 0.01) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  // El primer valor de X-Forwarded-For lo puede fijar el propio cliente (se
  // falsea con una cabecera cualquiera); el último hop es el que agrega nuestro
  // proxy de confianza (Vercel u otro) justo antes de llegar al servidor, así
  // que es el único valor en el que realmente se puede confiar.
  const hops = forwarded.split(",").map((ip) => ip.trim());
  return hops[hops.length - 1] || "unknown";
}
