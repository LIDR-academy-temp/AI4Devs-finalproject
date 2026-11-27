// HU-01.2 · Reglas de la sesión que no dependen del servicio ni de la base.
// Origen: openspec/specs/acceso/spec.md, requisitos «Mensaje único ante
// credenciales incorrectas» (HU-01.CA-3, D-59), «Sesión vigente» (HU-01.CA-6,
// D-69, D-104) y «Peticiones que vienen de otro sitio» (HU-01.CA-2).
// Pruebas: tests/unit/sesion.test.ts.

/** El mismo mensaje cuando el correo no tiene cuenta, la contraseña es incorrecta o la cuenta está desactivada. */
export const MENSAJE_UNICO = "El correo o la contraseña no son correctos.";

/** Respuesta a una entrada o un cierre que no viene del propio sitio: no se hace nada. */
export const ORIGEN_RECHAZADO = Object.freeze({
  estado: "rechazada",
  codigo: 403,
  mensaje: "La petición no viene del sistema; no se hizo nada.",
} as const);

/**
 * Respuesta a un cierre que falló **y** dejó la sesión viva en el navegador,
 * o que no se pudo comprobar: no se dice «cerrada» lo que no se vio cerrado.
 * Un error del servicio por sí solo no llega aquí —con alcance local la
 * sesión del navegador ya está borrada cuando el servicio contesta—, así que
 * este aviso solo sale cuando de verdad queda sesión (revisión del tramo 4,
 * ronda 1, y su revisión interna).
 */
export const NO_SE_CERRO = Object.freeze({
  estado: "no-cerrada",
  codigo: 503,
  mensaje: "No pudimos cerrar la sesión. Inténtalo de nuevo en unos minutos.",
} as const);

const HORA_MS = 3600 * 1000;
const MOMENTO_EN_TEXTO = /^[0-9]{1,12}$/;

/** Un momento de entrada (segundos), con la forma que acepta también la base: un entero de 1 a 12 dígitos. */
function segundosValidos(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isInteger(valor) && valor >= 0 && valor <= 999_999_999_999 ? valor : null;
  }
  if (typeof valor === "string" && MOMENTO_EN_TEXTO.test(valor)) return Number(valor);
  return null;
}

/**
 * El momento en que la persona entró con contraseña, tal como el servicio lo
 * anota en el pase (amr). Con varias entradas con contraseña cuenta la más
 * antigua (D-104). Sin ninguna, null: ante la duda, la sesión vence. Es la
 * misma lectura que hace la base en es_mi_organizacion.
 *
 * Una entrada con contraseña cuyo momento no se puede leer tampoco da momento:
 * no se descarta como si no existiera, porque entonces no se sabe cuál es la
 * más antigua y la vigencia podría contarse desde una entrada posterior
 * (D-105, hallazgo E de la ronda 1 del tramo 4). Lo que no es una entrada con
 * contraseña —otro método, o algo que no es ni un objeto— no estorba.
 */
export function momentoDeEntrada(contenidoDelPase: unknown): Date | null {
  const amr = (contenidoDelPase as { amr?: unknown } | null)?.amr;
  if (!Array.isArray(amr)) return null;
  let menor: number | null = null;
  for (const entrada of amr) {
    if (typeof entrada !== "object" || entrada === null) continue;
    const { method, timestamp } = entrada as { method?: unknown; timestamp?: unknown };
    if (method !== "password") continue;
    const s = segundosValidos(timestamp);
    if (s === null) return null;
    if (menor === null || s < menor) menor = s;
  }
  return menor === null ? null : new Date(menor * 1000);
}

/**
 * Sí si no pasaron más de `dias` días desde la entrada. Un día son 24 horas,
 * sin zona horaria ni cambio de horario (D-104); en el instante exacto del
 * plazo todavía vale. Un plazo que no es un entero positivo responde no.
 *
 * Una entrada posterior a la hora de la petición responde no, sin tolerancia
 * de desfase: un reloj adelantado en el servicio alargaría la vigencia tanto
 * como el adelanto (hallazgo G de la ronda 1 del tramo 4). En el instante
 * exacto de la petición todavía vale; el límite es «después».
 */
export function dentroDelPlazo(entrada: Date, dias: number, ahora: Date): boolean {
  if (!Number.isInteger(dias) || dias <= 0) return false;
  const desde = entrada.getTime();
  const hasta = ahora.getTime();
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return false;
  if (desde > hasta) return false;
  return desde + dias * 24 * HORA_MS >= hasta;
}

/** El origen (esquema, servidor y puerto) de una dirección, o null si no lo es. */
function origenDe(direccion: string): string | null {
  try {
    const url = new URL(direccion);
    return url.origin === "null" ? null : url.origin;
  } catch {
    return null;
  }
}

/**
 * Sí solo si la petición declara venir de la dirección pública del sistema,
 * que es un dato de configuración. Sin origen, con origen nulo, desde otro
 * sitio, otro subdominio, otro esquema u otro puerto: no. Sin dirección
 * pública válida configurada, todo se rechaza.
 */
export function vieneDelPropioSitio(origen: string | null | undefined, direccionPublica: string | null | undefined): boolean {
  if (!origen || !direccionPublica) return false;
  const propio = origenDe(direccionPublica);
  const declarado = origenDe(origen);
  return propio !== null && declarado !== null && declarado === propio;
}

/** Las marcas de una cookie, con la forma que usa el cliente oficial. */
export interface OpcionesDeCookie {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  [otra: string]: unknown;
}

/**
 * Las marcas con que el sistema escribe la cookie de sesión: que el código de
 * la página no la lea, sin dominio (el navegador solo la envía al propio
 * sitio) y, si la dirección pública es cifrada, solo por conexión cifrada.
 * El resto de lo que pida el cliente oficial se conserva.
 *
 * La marca de conexión cifrada sale del esquema de la dirección ya leída como
 * URL, no de comparar su texto: los esquemas no distinguen mayúsculas, y
 * `HTTPS://...` es tan cifrada como `https://...` (hallazgo D de la ronda 1
 * del tramo 4). Si la dirección pública no se puede leer como URL, la cookie
 * sale marcada como cifrada: es el lado seguro, y con esa configuración el
 * sistema rechaza igual toda entrada y todo cierre (vieneDelPropioSitio).
 */
export function opcionesDeCookie(pedidas: OpcionesDeCookie, direccionPublica: string): OpcionesDeCookie {
  // `domain` se descarta: nunca se escribe, aunque el cliente oficial lo pida.
  const { domain: _descartado, ...resto } = pedidas;
  void _descartado;
  return { ...resto, httpOnly: true, secure: esCifrada(direccionPublica) };
}

/** Si la dirección pública usa conexión cifrada. Una dirección que no se puede leer: sí, el lado seguro. */
function esCifrada(direccion: string): boolean {
  try {
    return new URL(direccion).protocol === "https:";
  } catch {
    return true;
  }
}
