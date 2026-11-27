// HU-01.2 · Sesión vigente, entrar y cerrar: el único lugar del código que
// decide si una petición tiene sesión.
// Origen: openspec/specs/acceso/spec.md, requisitos «Entrar con cuenta activa»
// (HU-01.CA-1, CA-4), «Mensaje único ante credenciales incorrectas» (CA-3),
// «Sesión vigente» (CA-5, CA-6; D-60, D-69, D-76, D-104), «Cerrar la sesión»
// (CA-7) y «Peticiones que vienen de otro sitio» (CA-2).
// Pruebas: tests/unit/sesion.test.ts; con el cliente oficial y la base local,
// tests/integration/sesion.test.ts.
//
// Las tres condiciones de una sesión vigente, en cada petición:
//   1. el servicio la reconoce: se le consulta con el pase (getUser, D-76);
//   2. el usuario existe y está activo;
//   3. no pasaron más de sesion_dias días desde la entrada con contraseña.
// La base exige lo mismo en su regla de separación; aquí se exige otra vez,
// porque es la condición del sistema y no solo de la base. Si falla
// cualquiera, la sesión se cierra en el servicio (alcance local: solo la de
// este navegador) y la petición se trata como sin sesión.
//
// Límites declarados:
//   - Cerrar las demás sesiones (HU-01.CA-11) queda fuera por el recorte v4:
//     se cierra solo la de este navegador.
//   - Un error de la base al leer el usuario no cierra la sesión: se informa
//     con mensaje nuestro (cerrarla por una falla pasajera sacaría a todos).
//     En la entrada es al contrario: ahí la sesión acaba de crearse y, si no se
//     pudo comprobar el usuario, se retira (hallazgo B de la ronda 1 del
//     tramo 4), porque nadie debe quedar con sesión sin usuario comprobado.
//   - Un cierre que el servicio rechaza o no contesta no se declara hecho
//     (hallazgo A); el corte automático sí sigue adelante, y su límite está en
//     cortar().
//   - Las pantallas y el desvío a la entrada de toda página sin sesión son de
//     HU-01.3.
import { leerMiUsuario, type ClienteDeDatos, type Filtrable, type Identidad, type UnaFila } from "@/lib/datos/separacion";
import {
  MENSAJE_UNICO,
  NO_SE_CERRO,
  ORIGEN_RECHAZADO,
  dentroDelPlazo,
  momentoDeEntrada,
  vieneDelPropioSitio,
} from "@/lib/sesion/reglas";

type ConError = { error: unknown };
type ConPase = { access_token: string } | null;

/** Lo que el código usa del cliente oficial del servicio. */
export interface ClienteDeSesion<Q extends Filtrable<Q> & UnaFila> extends ClienteDeDatos<Q> {
  auth: {
    getSession(): PromiseLike<{ data: { session: ConPase } } & ConError>;
    getUser(pase: string): PromiseLike<{ data: { user: { id: string } | null } } & ConError>;
    signInWithPassword(credenciales: { email: string; password: string }): PromiseLike<{ data: { session: ConPase } } & ConError>;
    signOut(opciones: { scope: "local" }): PromiseLike<ConError>;
  };
}

/** Lo que dice el pase (su parte central). La firma la comprueba el servicio en getUser. */
function contenidoDelPase(pase: string): Record<string, unknown> | null {
  const partes = pase.split(".");
  if (partes.length !== 3) return null;
  try {
    const contenido: unknown = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
    return typeof contenido === "object" && contenido !== null ? (contenido as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión de este navegador en el servicio; lo que responda no cambia
 * que la petición queda sin sesión, porque una condición ya falló.
 *
 * Límite declarado (hallazgo A de la ronda 1 del tramo 4): el error del
 * servicio no sale a quien pregunta. Con alcance local el cliente oficial
 * borra la sesión del navegador antes de pedir la revocación, así que lo que
 * puede quedar sin revocar es el pase en el servicio, no el cierre local; si
 * ni eso se consigue, cada petición vuelve a comprobar las tres condiciones y
 * a intentar el corte. Lo que sí volvería a servir es ese pase si la cuenta se
 * reactiva dentro del plazo.
 */
async function cortar<Q extends Filtrable<Q> & UnaFila>(cliente: ClienteDeSesion<Q>): Promise<null> {
  try {
    await cliente.auth.signOut({ scope: "local" });
  } catch {
    // Sin respuesta del servicio: la petición queda sin sesión igual.
  }
  return null;
}

/** Las tres condiciones sobre un pase dado. Devuelve quién pregunta, o null y la sesión cerrada. */
async function comprobarPase<Q extends Filtrable<Q> & UnaFila>(
  cliente: ClienteDeSesion<Q>,
  pase: string,
  ahora: Date,
): Promise<Identidad | null> {
  // 1. El servicio la reconoce: se le consulta en cada petición (D-76).
  const { data, error } = await cliente.auth.getUser(pase);
  const usuarioId = data?.user?.id;
  if (error || !usuarioId) return cortar(cliente);
  const contenido = contenidoDelPase(pase);
  if (!contenido || contenido.sub !== usuarioId) return cortar(cliente);

  // 2. El usuario existe y está activo. Si la base no lo deja ver (inactivo,
  //    sesión vencida para ella o sin usuario), tampoco hay sesión.
  const mio = await leerMiUsuario(cliente, usuarioId);
  if (!mio || !mio.activo) return cortar(cliente);

  // 3. Dentro del plazo de su organización, leído en esta petición.
  const entrada = momentoDeEntrada(contenido);
  if (!entrada || !dentroDelPlazo(entrada, mio.sesionDias, ahora)) return cortar(cliente);

  return { usuarioId: mio.usuarioId, organizacionId: mio.organizacionId };
}

/**
 * Quién hace esta petición, si tiene una sesión vigente; null si no. Es lo
 * primero que hace toda página y toda operación que use una persona.
 */
export async function sesionVigente<Q extends Filtrable<Q> & UnaFila>(
  cliente: ClienteDeSesion<Q>,
  ahora: Date = new Date(),
): Promise<Identidad | null> {
  const { data } = await cliente.auth.getSession();
  const pase = data?.session?.access_token;
  if (!pase) return null;
  return comprobarPase(cliente, pase, ahora);
}

export type ResultadoDeEntrar =
  | { estado: "dentro"; identidad: Identidad }
  | { estado: "rechazada"; codigo: 401; mensaje: typeof MENSAJE_UNICO }
  | typeof ORIGEN_RECHAZADO;

const NO_ENTRA = { estado: "rechazada", codigo: 401, mensaje: MENSAJE_UNICO } as const;

/**
 * Si el error de la entrada es un rechazo del servicio a esas credenciales, y
 * no una falla del servicio. El cliente oficial responde con el estado de la
 * API cuando rechaza (400, 401, 422) y sin estado cuando no pudo llegar. Sin
 * estado, o con uno de 500 en adelante, no se da por rechazada la entrada:
 * ante la duda no se toca la sesión que el navegador ya tenía.
 *
 * Límite declarado: quien recibe el mensaje único no distingue un rechazo de
 * una falla del servicio. Lo exige el mensaje único (HU-01.CA-3, D-59), y
 * decirlo aparte queda para la pantalla de entrada (HU-01.3).
 */
function rechazoDeCredenciales(error: unknown): boolean {
  const estado = (error as { status?: unknown } | null)?.status;
  return typeof estado === "number" && estado >= 400 && estado < 500;
}

/**
 * Entra con correo y contraseña. Solo desde el propio sitio, y solo queda con
 * sesión quien tiene una cuenta cuyo usuario está activo. Ante credenciales
 * incorrectas, correo sin cuenta, cuenta desactivada o cuenta sin usuario, el
 * mismo mensaje, y el navegador sin sesión.
 */
export async function entrar<Q extends Filtrable<Q> & UnaFila>(
  cliente: ClienteDeSesion<Q>,
  credenciales: { correo: string; contrasena: string },
  origen: string | null | undefined,
  direccionPublica: string,
  ahora: Date = new Date(),
): Promise<ResultadoDeEntrar> {
  if (!vieneDelPropioSitio(origen, direccionPublica)) return ORIGEN_RECHAZADO;
  const { correo, contrasena } = credenciales;
  const { data, error } = await cliente.auth.signInWithPassword({ email: correo, password: contrasena });
  const pase = data?.session?.access_token;
  if (error || !pase) {
    // El navegador puede traer una sesión de antes: lo que este requisito
    // promete es que una entrada rechazada lo deja sin sesión, y si no se
    // corta sigue operando como la persona anterior (hallazgo C de la ronda 1
    // del tramo 4). Pero solo cuando el servicio rechazó las credenciales: si
    // lo que falló es el servicio mismo, cortar sacaría de su sesión a quien
    // ya estaba dentro (revisión interna de esa ronda).
    if (!error || rechazoDeCredenciales(error)) await cortar(cliente);
    return NO_ENTRA;
  }
  let identidad: Identidad | null;
  try {
    identidad = await comprobarPase(cliente, pase, ahora);
  } catch (causa) {
    // La sesión ya quedó escrita en el navegador. Si no se pudo comprobar el
    // usuario, se retira antes de informar: solo queda con sesión quien tiene
    // usuario activo (hallazgo B). El límite «un error de la base no cierra la
    // sesión» vale para una petición ya autenticada, no para la entrada.
    await cortar(cliente);
    throw causa;
  }
  return identidad ? { estado: "dentro", identidad } : NO_ENTRA;
}

/**
 * Cierra la sesión de este navegador: el pase que tenía deja de servir. Solo
 * desde el propio sitio.
 *
 * Un error del cierre no basta para decir que la sesión sigue abierta: el
 * cliente oficial, con alcance local, **borra la sesión del navegador antes de
 * pedir la revocación al servicio**, así que su error suele ser de la
 * revocación y no del cierre. Por eso, si hay error, se comprueba si queda
 * sesión: si no queda, la sesión está cerrada; si queda —o no se puede
 * comprobar—, no se dice «cerrada» (hallazgo A de la ronda 1 del tramo 4,
 * corregido por su revisión interna).
 *
 * **Límite declarado:** cuando el cierre local se hizo pero la revocación en
 * el servicio falló, el pase anterior puede seguir siendo válido en el
 * servicio hasta que caduque. Este navegador ya no lo tiene; quien tuviera una
 * copia podría usarlo. Mientras el usuario esté activo y dentro del plazo, las
 * tres condiciones de «Sesión vigente» lo darían por bueno.
 */
export async function cerrar<Q extends Filtrable<Q> & UnaFila>(
  cliente: ClienteDeSesion<Q>,
  origen: string | null | undefined,
  direccionPublica: string,
): Promise<{ estado: "cerrada" } | typeof NO_SE_CERRO | typeof ORIGEN_RECHAZADO> {
  if (!vieneDelPropioSitio(origen, direccionPublica)) return ORIGEN_RECHAZADO;
  try {
    const { error } = await cliente.auth.signOut({ scope: "local" });
    if (!error) return { estado: "cerrada" };
  } catch {
    // La llamada falló; aun así la sesión local pudo quedar borrada. Se
    // comprueba igual que en el caso del error devuelto.
  }
  try {
    const { data } = await cliente.auth.getSession();
    if (!data?.session?.access_token) return { estado: "cerrada" };
  } catch {
    // No se puede comprobar: no se afirma un cierre que no se vio.
    return NO_SE_CERRO;
  }
  return NO_SE_CERRO;
}
