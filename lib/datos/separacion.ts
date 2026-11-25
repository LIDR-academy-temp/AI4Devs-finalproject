// HU-03.2 · Separación por organización en el código: el único lugar por el
// que el código consulta tablas.
// Origen: openspec/specs/acceso/spec.md, requisito «Separación por organización
// en el código» (HU-03.CA-1, CA-3, CA-4; D-59) y D-67: un dato de otra
// organización responde igual que uno que no existe.
// Pruebas: tests/unit/separacion.test.ts.
//
// Es la segunda capa. La primera es la regla restrictiva de cada tabla en la
// base (es_mi_organizacion), que corta aunque este filtro faltara. Aquí, toda
// consulta sale ya filtrada por la organización de quien pregunta, y una fila
// de otra organización que llegara igual se trata como inexistente.
//
// Límite declarado: la identidad (usuario y organización de quien pregunta) la
// entrega «Sesión vigente» (HU-01.2); este módulo la recibe, no la obtiene.
//
// Pendiente (revisión interna del tramo 3): las operaciones de la base que se
// llaman como función (rpc), como el registro del aviso, también pasan por
// aquí; este módulo todavía no ofrece cómo llamarlas, y el ticket del aviso
// (HU-06.3) agrega esa entrada. Hasta entonces, la prueba de «un solo lugar»
// rechaza cualquier llamada directa.

/** Tablas que el código puede consultar. Una tabla nueva entra aquí, o no se consulta. */
export const TABLAS = ["organizacion", "usuario"] as const;
export type Tabla = (typeof TABLAS)[number];

/** Quién pregunta: su usuario y su organización, tal como los da la sesión vigente. */
export interface Identidad {
  usuarioId: string;
  organizacionId: string;
}

/** Lo que el código necesita del cliente oficial del servicio (from → select → eq). */
export interface Filtrable<Q> {
  eq(columna: string, valor: string): Q;
}
export interface ClienteDeDatos<Q extends Filtrable<Q>> {
  from(tabla: string): { select(columnas?: string): Q };
}
interface UnaFila {
  maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/** La misma respuesta, en código y en mensaje, para lo ajeno y lo inexistente (D-67). */
export const NO_EXISTE = Object.freeze({
  estado: "no-existe",
  codigo: 404,
  mensaje: "No encontramos lo que buscas.",
} as const);

export type Respuesta<T> = { estado: "encontrado"; dato: T } | typeof NO_EXISTE;

const IDENTIFICADOR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La columna que dice de qué organización es cada fila. La tabla organizacion es la excepción. */
function columnaDeOrganizacion(tabla: Tabla): string {
  return tabla === "organizacion" ? "id" : "organizacion_id";
}

/**
 * Empieza toda consulta del código: la tabla, ya filtrada por la organización
 * de quien pregunta. Sin una organización válida, o con una tabla fuera de la
 * lista, no se arma ninguna consulta.
 */
export function consultar<Q extends Filtrable<Q>>(
  cliente: ClienteDeDatos<Q>,
  identidad: Identidad,
  tabla: Tabla,
  columnas = "*",
): Q {
  if (!(TABLAS as readonly string[]).includes(tabla)) {
    throw new Error(`La tabla ${String(tabla)} no está en la lista de tablas que el código puede consultar.`);
  }
  if (!IDENTIFICADOR.test(identidad?.organizacionId ?? "")) {
    throw new Error("No se consulta sin la organización de quien pregunta.");
  }
  return cliente.from(tabla).select(columnas).eq(columnaDeOrganizacion(tabla), organizacionDe(identidad));
}

/** La organización de quien pregunta, en la forma en que la base escribe los identificadores (minúsculas). */
function organizacionDe(identidad: Identidad): string {
  return identidad.organizacionId.toLowerCase();
}

/**
 * Busca una fila por su identificador. Lo propio se entrega; lo ajeno, lo
 * inexistente y un identificador mal formado responden NO_EXISTE. Un error de
 * la base no se disfraza de «no existe»: se informa con mensaje nuestro.
 */
export async function buscarPorId<T extends Record<string, unknown>, Q extends Filtrable<Q> & UnaFila>(
  cliente: ClienteDeDatos<Q>,
  identidad: Identidad,
  tabla: Tabla,
  id: string,
): Promise<Respuesta<T>> {
  if (!IDENTIFICADOR.test(id ?? "")) return NO_EXISTE;
  const { data, error } = await consultar(cliente, identidad, tabla).eq("id", id).maybeSingle();
  if (error) {
    // El mensaje es fijo; el del motor queda como causa, para el registro
    // interno, y no llega a quien pregunta (revisión del tramo 3, ronda 1).
    throw new Error(`No se pudo consultar ${tabla}. Inténtalo de nuevo en unos minutos.`, { cause: error });
  }
  const fila = data as T | null;
  const deFila = String(fila?.[columnaDeOrganizacion(tabla)] ?? "").toLowerCase();
  if (!fila || deFila !== organizacionDe(identidad)) return NO_EXISTE;
  return { estado: "encontrado", dato: fila };
}

/** Lo que no es una consulta aunque se escriba `X.from(...)`. */
const NO_SON_CONSULTAS = new Set([
  "Array", "Buffer", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array",
  "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array",
]);

/**
 * Cuántas consultas directas a la base hay en un texto de código: `.from(...)`
 * o `.rpc(...)` sobre un cliente, con cualquier argumento, y también por
 * corchetes (`["from"](...)`). `Array.from(...)` y sus parientes no cuentan.
 * Lo usa la prueba que vigila que el código consulte solo por este módulo.
 * Límite declarado: es una búsqueda en el texto, no un análisis del código.
 * No ve una consulta por `fetch` directo a la API de la base, ni un `from` sacado
 * del cliente por desestructuración o llamado con `.call`, ni un nombre de método
 * calculado en ejecución. Puede marcar en falso un `X.from(...)` que no es una
 * consulta (por ejemplo, de fechas); ese error es del lado seguro: la prueba falla.
 */
export function usosDirectos(codigo: string): number {
  let cuenta = 0;
  for (const m of codigo.matchAll(/([A-Za-z0-9_$]*)\s*\.\s*(?:from|rpc)\s*\(/g)) {
    if (!NO_SON_CONSULTAS.has(m[1])) cuenta += 1;
  }
  cuenta += (codigo.match(/\[\s*["'`](?:from|rpc)["'`]\s*\]\s*\(/g) ?? []).length;
  return cuenta;
}
