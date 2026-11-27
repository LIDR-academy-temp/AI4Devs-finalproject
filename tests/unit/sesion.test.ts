// HU-01.2 · Reglas de la sesión: entrar, cerrar, vigencia leída de un parámetro
// y corte al desactivar la cuenta.
// Origen: openspec/specs/acceso/spec.md, requisitos «Entrar con cuenta activa»,
// «Mensaje único ante credenciales incorrectas», «Sesión vigente», «Cerrar la
// sesión» y «Peticiones que vienen de otro sitio» (HU-01.CA-1, CA-2, CA-3,
// CA-4, CA-5, CA-6, CA-7; D-60, D-69, D-76, D-104). El cierre de las demás
// sesiones (HU-01.CA-11) queda fuera por el recorte v4.
// Cada pieza con un caso que pasa y uno que se rechaza.
//
// El servicio de autenticación y la base se reemplazan por un cliente falso:
// aquí se prueba la regla del código. Lo que la base hace con el pase real lo
// prueba tests/base/prueba-sesion.py; el flujo con el cliente oficial y la base
// local, tests/integration/sesion.test.ts (necesita la base levantada; la
// corre también la integración continua, en su trabajo de la base).
import { describe, expect, it } from "vitest";
import {
  MENSAJE_UNICO,
  NO_SE_CERRO,
  ORIGEN_RECHAZADO,
  dentroDelPlazo,
  momentoDeEntrada,
  opcionesDeCookie,
  vieneDelPropioSitio,
} from "@/lib/sesion/reglas";
import { cerrar, entrar, sesionVigente } from "@/lib/sesion/vigente";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const YO = "44444444-4444-4444-8444-444444444444";
const OTRO = "55555555-5555-4555-8555-555555555555";
const SITIO = "https://ct.example.com";
const HORA = 3600 * 1000;
const DIA = 24 * HORA;
const AHORA = new Date("2026-11-25T15:00:00Z");

const segundos = (fecha: Date) => Math.floor(fecha.getTime() / 1000);
const hace = (ms: number) => new Date(AHORA.getTime() - ms);

/** Un pase con la forma del que emite el servicio. La firma no se mira: la comprueba el servicio (getUser). */
function pase(contenido: Record<string, unknown>): string {
  const parte = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${parte({ alg: "HS256", typ: "JWT" })}.${parte(contenido)}.firma`;
}
const entradaCon = (...momentos: Date[]) => momentos.map((m) => ({ method: "password", timestamp: segundos(m) }));

type Fila = { id: string; organizacion_id: string; activo: boolean; organizacion: { sesion_dias: number } | null };
interface Escenario {
  sesion?: string | null; // el pase que guarda la cookie
  servicioAcepta?: boolean; // getUser
  usuarioDelServicio?: string;
  fila?: Fila | null; // lo que la base deja ver del propio usuario
  errorDeBase?: boolean;
  credencialesValidas?: boolean; // signInWithPassword
  paseAlEntrar?: string;
  // Lo que hace signOut cuando se le pide cerrar.
  //   "error":     devuelve error en el campo que su contrato declara y, como
  //                el cliente oficial con alcance local, ya ha borrado la
  //                sesión del navegador: el error es de la revocación en el
  //                servicio, no del cierre local.
  //   "excepcion": la llamada falla; la sesión ya está borrada, igual.
  //   "vive":      devuelve error y la sesión sigue en el navegador. Es el
  //                camino que el cliente oficial deja abierto cuando el error
  //                de sesión no es pasajero ni «no hay sesión».
  // Los dos primeros se comprobaron contra @supabase/auth-js 2.119.0, que
  // borra la sesión local antes de pedir la revocación (revisión interna de
  // la ronda 1 del tramo 4).
  cierreFalla?: "error" | "excepcion" | "vive";
  // Tras un cierre que falló, tampoco se puede comprobar si quedó sesión.
  errorAlComprobarCierre?: boolean;
  // Lo que devuelve signInWithPassword cuando no son credenciales
  // incorrectas, sino que el servicio no está: un error sin estado, como el
  // que da el cliente oficial al no poder llegar (AuthRetryableFetchError).
  servicioCaido?: boolean;
}

// Cliente falso: imita del cliente oficial lo que usa el código (auth y
// from → select → eq → maybeSingle) y anota cada llamada.
function clienteFalso(e: Escenario) {
  const anotado = {
    getUser: [] as string[],
    signOut: [] as unknown[],
    signIn: [] as unknown[],
    tabla: "",
    columnas: "",
    filtros: [] as [string, string][],
  };
  let guardado: string | null = e.sesion ?? null;
  const consulta = {
    eq(columna: string, valor: string) {
      anotado.filtros.push([columna, valor]);
      return consulta;
    },
    async maybeSingle() {
      if (e.errorDeBase) return { data: null, error: { message: "conexión perdida" } };
      return { data: e.fila ?? null, error: null };
    },
  };
  const cliente = {
    auth: {
      async getSession() {
        if (e.errorAlComprobarCierre && anotado.signOut.length > 0) throw new Error("no se pudo leer la sesión");
        return { data: { session: guardado ? { access_token: guardado } : null }, error: null };
      },
      async getUser(p: string) {
        anotado.getUser.push(p);
        return e.servicioAcepta === false
          ? { data: { user: null }, error: { message: "sesión cerrada" } }
          : { data: { user: { id: e.usuarioDelServicio ?? YO } }, error: null };
      },
      async signInWithPassword(c: { email: string; password: string }) {
        anotado.signIn.push(c);
        if (e.servicioCaido) return { data: { session: null }, error: { message: "Failed to fetch" } };
        if (!e.credencialesValidas) {
          return { data: { session: null }, error: { status: 400, message: "Invalid login credentials" } };
        }
        guardado = e.paseAlEntrar ?? null;
        return { data: { session: guardado ? { access_token: guardado } : null }, error: null };
      },
      async signOut(o: { scope: "local" }) {
        anotado.signOut.push(o);
        if (e.cierreFalla === "vive") return { error: { message: "no se pudo cerrar la sesión" } };
        // Como el cliente oficial con alcance local: la sesión del navegador
        // se borra antes de pedir la revocación, pase lo que pase después.
        guardado = null;
        if (e.cierreFalla === "excepcion") throw new Error("no hubo respuesta del servicio");
        if (e.cierreFalla === "error") return { error: { message: "no se revocó el pase en el servicio" } };
        return { error: null };
      },
    },
    from(tabla: string) {
      anotado.tabla = tabla;
      return {
        select(columnas = "*") {
          anotado.columnas = columnas;
          return consulta;
        },
      };
    },
  };
  return { cliente, anotado };
}

const filaActiva = (sesionDias = 30): Fila => ({
  id: YO,
  organizacion_id: ORG_A,
  activo: true,
  organizacion: { sesion_dias: sesionDias },
});
const paseDeHace = (ms: number) => pase({ sub: YO, amr: entradaCon(hace(ms)), session_id: "s-1" });

describe("momentoDeEntrada: el que el servicio anota en el pase al entrar con contraseña (D-104)", () => {
  it("P1 una entrada con contraseña da su momento", () => {
    expect(momentoDeEntrada({ amr: entradaCon(hace(3 * DIA)) })).toEqual(new Date(segundos(hace(3 * DIA)) * 1000));
  });
  it("P2 con varias entradas con contraseña cuenta la más antigua", () => {
    const amr = entradaCon(hace(DIA), hace(10 * DIA), hace(2 * DIA));
    expect(momentoDeEntrada({ amr })).toEqual(new Date(segundos(hace(10 * DIA)) * 1000));
  });
  it("P3 el momento escrito como texto de dígitos también vale, como en la base", () => {
    expect(momentoDeEntrada({ amr: [{ method: "password", timestamp: "1764000000" }] })).toEqual(
      new Date(1764000000 * 1000),
    );
  });
  it("N1 sin entradas, o sin la lista, no hay momento: ante la duda, la sesión vence", () => {
    expect(momentoDeEntrada({})).toBeNull();
    expect(momentoDeEntrada({ amr: [] })).toBeNull();
    expect(momentoDeEntrada({ amr: "password" })).toBeNull();
    expect(momentoDeEntrada(null)).toBeNull();
  });
  it("N2 una entrada por otro método no cuenta", () => {
    expect(momentoDeEntrada({ amr: [{ method: "otp", timestamp: segundos(hace(DIA)) }] })).toBeNull();
  });
  it("N3 un momento con otra forma no cuenta (fracción, negativo, letras, más de 12 dígitos)", () => {
    for (const timestamp of [1764000000.5, -5, "17x", "1234567890123", null, true]) {
      expect(momentoDeEntrada({ amr: [{ method: "password", timestamp }] })).toBeNull();
    }
  });
  it("N4 una entrada con contraseña cuyo momento no se puede leer impide saber cuál es la más antigua: vence (D-105)", () => {
    const amr = [{ method: "password", timestamp: "x" }, ...entradaCon(hace(DIA))];
    expect(momentoDeEntrada({ amr })).toBeNull();
    // Sin momento, o con un momento de otra forma, igual: no se descarta esa
    // entrada como si no existiera.
    expect(momentoDeEntrada({ amr: [{ method: "password" }, ...entradaCon(hace(DIA))] })).toBeNull();
  });
  it("P17 lo que no es una entrada con contraseña no estorba: basura en la lista y otro método no tapan a la buena", () => {
    const amr = ["basura", { method: "otp", timestamp: "x" }, null, ...entradaCon(hace(DIA))];
    expect(momentoDeEntrada({ amr })).toEqual(new Date(segundos(hace(DIA)) * 1000));
  });
});

describe("dentroDelPlazo: un día son 24 horas, y el instante exacto todavía vale (D-104)", () => {
  it("P4 en el instante exacto del plazo se acepta; N5 un segundo después, no", () => {
    const entrada = hace(30 * DIA);
    expect(dentroDelPlazo(entrada, 30, AHORA)).toBe(true);
    expect(dentroDelPlazo(entrada, 30, new Date(AHORA.getTime() + 1000))).toBe(false);
  });
  it("P5 el plazo no depende del cambio de horario: 24 horas exactas aunque esa noche cambie la hora", () => {
    // En Nueva York, la madrugada del 08/03/2026 el reloj salta de 02:00 a 03:00.
    const entrada = new Date("2026-03-07T12:00:00Z");
    expect(dentroDelPlazo(entrada, 1, new Date("2026-03-08T12:00:00Z"))).toBe(true);
    expect(dentroDelPlazo(entrada, 1, new Date("2026-03-08T12:00:01Z"))).toBe(false);
  });
  it("N6 con sesion_dias en 1, 25 horas después se rechaza; P6 con 30, sigue vigente", () => {
    expect(dentroDelPlazo(hace(25 * HORA), 1, AHORA)).toBe(false);
    expect(dentroDelPlazo(hace(25 * HORA), 30, AHORA)).toBe(true);
  });
  it("N7 un plazo que no es un entero positivo, o una entrada inválida, responde no", () => {
    for (const dias of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(dentroDelPlazo(hace(HORA), dias, AHORA)).toBe(false);
    }
    expect(dentroDelPlazo(new Date("no es fecha"), 30, AHORA)).toBe(false);
  });
  it("N30 una entrada posterior a la hora de la petición responde no: no alarga la vigencia", () => {
    expect(dentroDelPlazo(new Date(AHORA.getTime() + 1000), 30, AHORA)).toBe(false);
    expect(dentroDelPlazo(new Date(AHORA.getTime() + 10 * DIA), 1, AHORA)).toBe(false);
    // En el instante exacto de la petición todavía vale: el límite es «después».
    expect(dentroDelPlazo(AHORA, 30, AHORA)).toBe(true);
  });
});

describe("vieneDelPropioSitio: el origen se compara con la dirección pública configurada", () => {
  it("P7 la misma dirección, con o sin barra final en la configuración", () => {
    expect(vieneDelPropioSitio(SITIO, SITIO)).toBe(true);
    expect(vieneDelPropioSitio(SITIO, `${SITIO}/`)).toBe(true);
  });
  it("N8 sin origen, con origen vacío o con origen nulo se rechaza", () => {
    for (const origen of [null, undefined, "", "null"]) expect(vieneDelPropioSitio(origen, SITIO)).toBe(false);
  });
  it("N9 otro sitio, otro subdominio, otro esquema u otro puerto se rechazan", () => {
    for (const origen of [
      "https://otro.example.com",
      "https://sub.ct.example.com",
      "http://ct.example.com",
      "https://ct.example.com:8443",
      "https://ct.example.com.otro.example.com",
    ]) {
      expect(vieneDelPropioSitio(origen, SITIO)).toBe(false);
    }
  });
  it("N10 sin dirección pública válida configurada, todo se rechaza", () => {
    expect(vieneDelPropioSitio(SITIO, "")).toBe(false);
    expect(vieneDelPropioSitio(SITIO, undefined)).toBe(false);
    expect(vieneDelPropioSitio(SITIO, "no es una dirección")).toBe(false);
  });
});

describe("opcionesDeCookie: la cookie la escribe el sistema, sin que la lea la página y sin dominio", () => {
  it("P8 marcada para que la página no la lea, sin dominio y cifrada en el sistema desplegado", () => {
    const o = opcionesDeCookie({ path: "/", sameSite: "lax", httpOnly: false, maxAge: 100 }, SITIO);
    expect(o.httpOnly).toBe(true);
    expect("domain" in o).toBe(false);
    expect(o.secure).toBe(true);
    expect(o.sameSite).toBe("lax");
    expect(o.path).toBe("/");
  });
  it("N11 aunque el cliente oficial pida un dominio, la cookie sale sin él", () => {
    expect("domain" in opcionesDeCookie({ domain: "example.com", httpOnly: false }, SITIO)).toBe(false);
  });
  it("P9 en local, sin cifrado, no se marca como cifrada (se comprueba en el despliegue, H-4)", () => {
    expect(opcionesDeCookie({}, "http://localhost:3000").secure).toBe(false);
    expect(opcionesDeCookie({}, "http://localhost:3000").httpOnly).toBe(true);
  });
  it("P18 la marca sale del esquema de la dirección, no de su texto: en mayúsculas también es cifrada", () => {
    expect(opcionesDeCookie({}, "HTTPS://ct.example.com").secure).toBe(true);
    expect(opcionesDeCookie({}, "HttpS://CT.EXAMPLE.COM/").secure).toBe(true);
  });
  it("N31 sin una dirección pública que se pueda leer, la cookie sale marcada como cifrada: el lado seguro", () => {
    expect(opcionesDeCookie({}, "no es una dirección").secure).toBe(true);
    expect(opcionesDeCookie({}, "").secure).toBe(true);
  });
});

describe("sesionVigente: las tres condiciones, en cada petición, en un solo lugar", () => {
  it("P10 sesión abierta, usuario activo y dentro del plazo: devuelve quién pregunta", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(3 * DIA), fila: filaActiva() });
    expect(await sesionVigente(cliente, AHORA)).toEqual({ usuarioId: YO, organizacionId: ORG_A });
    expect(anotado.signOut).toEqual([]);
  });
  it("P11 consulta al servicio en cada petición, con el pase de la cookie (D-76)", async () => {
    const p = paseDeHace(3 * DIA);
    const { cliente, anotado } = clienteFalso({ sesion: p, fila: filaActiva() });
    await sesionVigente(cliente, AHORA);
    await sesionVigente(cliente, AHORA);
    expect(anotado.getUser).toEqual([p, p]);
  });
  it("P12 lee el propio usuario por su identificador, con su organización y su plazo", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(DIA), fila: filaActiva() });
    await sesionVigente(cliente, AHORA);
    expect(anotado.tabla).toBe("usuario");
    expect(anotado.filtros).toEqual([["id", YO]]);
    expect(anotado.columnas).toContain("sesion_dias");
  });
  it("N12 sin sesión: no hay nadie y no se consulta nada", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: null });
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
    expect(anotado.getUser).toEqual([]);
  });
  it("N13 el servicio no reconoce la sesión (cerrada): sin sesión, y se cierra también aquí", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(DIA), servicioAcepta: false, fila: filaActiva() });
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N14 la cuenta se desactiva con la sesión abierta: la siguiente petición se rechaza y se cierra", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(DIA), fila: { ...filaActiva(), activo: false } });
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N15 la base no deja ver el usuario (no existe, inactivo o sesión vencida para ella): se cierra", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(DIA), fila: null });
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N16 pasó el plazo: se rechaza y la sesión queda cerrada", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(31 * DIA), fila: filaActiva(30) });
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N17 el plazo es un parámetro: 25 horas con sesion_dias en 1 se rechaza; P13 con 30, sigue", async () => {
    expect(await sesionVigente(clienteFalso({ sesion: paseDeHace(25 * HORA), fila: filaActiva(1) }).cliente, AHORA)).toBeNull();
    expect(await sesionVigente(clienteFalso({ sesion: paseDeHace(25 * HORA), fila: filaActiva(30) }).cliente, AHORA)).not.toBeNull();
  });
  it("N18 el plazo cambia con la sesión abierta: se lee en cada petición, no se copia al entrar", async () => {
    const escenario: Escenario = { sesion: paseDeHace(3 * DIA), fila: filaActiva(30) };
    const { cliente } = clienteFalso(escenario);
    expect(await sesionVigente(cliente, AHORA)).not.toBeNull();
    escenario.fila = filaActiva(1);
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
  });
  it("N19 el pase no trae el momento de entrada con contraseña: la sesión vence", async () => {
    const sinEntrada = pase({ sub: YO, amr: [{ method: "otp", timestamp: segundos(hace(HORA)) }] });
    const { cliente, anotado } = clienteFalso({ sesion: sinEntrada, fila: filaActiva() });
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N20 con dos entradas, cuenta la más antigua aunque la reciente esté dentro del plazo (D-104)", async () => {
    const dos = pase({ sub: YO, amr: entradaCon(hace(DIA), hace(31 * DIA)) });
    expect(await sesionVigente(clienteFalso({ sesion: dos, fila: filaActiva(30) }).cliente, AHORA)).toBeNull();
  });
  it("N21 el pase dice otra persona que la que reconoce el servicio: sin sesión", async () => {
    const ajeno = pase({ sub: OTRO, amr: entradaCon(hace(HORA)) });
    expect(await sesionVigente(clienteFalso({ sesion: ajeno, fila: filaActiva() }).cliente, AHORA)).toBeNull();
  });
  it("N22 un pase que no se puede leer: sin sesión", async () => {
    expect(await sesionVigente(clienteFalso({ sesion: "no-es-un-pase", fila: filaActiva() }).cliente, AHORA)).toBeNull();
  });
  it("N23 la fila que devuelve la base es de otra persona o viene incompleta: sin sesión", async () => {
    const otra = { ...filaActiva(), id: OTRO };
    const sinPlazo = { ...filaActiva(), organizacion: null };
    expect(await sesionVigente(clienteFalso({ sesion: paseDeHace(HORA), fila: otra }).cliente, AHORA)).toBeNull();
    expect(await sesionVigente(clienteFalso({ sesion: paseDeHace(HORA), fila: sinPlazo }).cliente, AHORA)).toBeNull();
  });
  it("N24 un error de la base no se disfraza de «sin sesión» ni cierra la sesión: se informa", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(HORA), errorDeBase: true });
    await expect(sesionVigente(cliente, AHORA)).rejects.toThrow("No se pudo comprobar la sesión");
    expect(anotado.signOut).toEqual([]);
  });
  it("N32 el momento de entrada del pase está en el futuro: la sesión vence y se cierra", async () => {
    const futuro = pase({ sub: YO, amr: [{ method: "password", timestamp: segundos(AHORA) + 3600 }] });
    const { cliente, anotado } = clienteFalso({ sesion: futuro, fila: filaActiva() });
    expect(await sesionVigente(cliente, AHORA)).toBeNull();
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N35 si el corte en el servicio falla, la petición queda sin sesión igual y el error no sale a quien pregunta", async () => {
    for (const cierreFalla of ["error", "excepcion"] as const) {
      const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(31 * DIA), fila: filaActiva(30), cierreFalla });
      expect(await sesionVigente(cliente, AHORA)).toBeNull();
      expect(anotado.signOut).toEqual([{ scope: "local" }]);
    }
  });
});

describe("entrar: solo con cuenta activa, con un mensaje único y desde el propio sitio", () => {
  const credenciales = { correo: "persona@example.com", contrasena: "clave-de-prueba" };

  it("P14 credenciales correctas y cuenta activa: queda dentro", async () => {
    const { cliente } = clienteFalso({ credencialesValidas: true, paseAlEntrar: paseDeHace(0), fila: filaActiva() });
    expect(await entrar(cliente, credenciales, SITIO, SITIO, AHORA)).toEqual({
      estado: "dentro",
      identidad: { usuarioId: YO, organizacionId: ORG_A },
    });
  });
  it("N25 contraseña incorrecta o correo sin cuenta: no entra y ve el mensaje único", async () => {
    const { cliente } = clienteFalso({ credencialesValidas: false });
    const r = await entrar(cliente, credenciales, SITIO, SITIO, AHORA);
    expect(r).toEqual({ estado: "rechazada", codigo: 401, mensaje: MENSAJE_UNICO });
  });
  it("N26 cuenta desactivada con credenciales correctas: no queda con sesión y ve el mismo mensaje, letra por letra", async () => {
    const { cliente, anotado } = clienteFalso({
      credencialesValidas: true,
      paseAlEntrar: paseDeHace(0),
      fila: { ...filaActiva(), activo: false },
    });
    const r = await entrar(cliente, credenciales, SITIO, SITIO, AHORA);
    expect(r).toEqual({ estado: "rechazada", codigo: 401, mensaje: MENSAJE_UNICO });
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
    expect(await cliente.auth.getSession()).toEqual({ data: { session: null }, error: null });
  });
  it("N27 cuenta del servicio sin usuario en la base: el mismo mensaje y sin sesión", async () => {
    const { cliente, anotado } = clienteFalso({ credencialesValidas: true, paseAlEntrar: paseDeHace(0), fila: null });
    expect(await entrar(cliente, credenciales, SITIO, SITIO, AHORA)).toEqual({
      estado: "rechazada",
      codigo: 401,
      mensaje: MENSAJE_UNICO,
    });
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N28 entrada desde otro sitio o sin origen: se rechaza sin llamar al servicio", async () => {
    for (const origen of ["https://otro.example.com", null, "null"]) {
      const { cliente, anotado } = clienteFalso({ credencialesValidas: true, paseAlEntrar: paseDeHace(0), fila: filaActiva() });
      expect(await entrar(cliente, credenciales, origen, SITIO, AHORA)).toEqual(ORIGEN_RECHAZADO);
      expect(anotado.signIn).toEqual([]);
    }
  });
  it("N36 con una sesión ya abierta en el navegador, una entrada rechazada la deja sin sesión", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(HORA), credencialesValidas: false });
    expect(await entrar(cliente, credenciales, SITIO, SITIO, AHORA)).toEqual({
      estado: "rechazada",
      codigo: 401,
      mensaje: MENSAJE_UNICO,
    });
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
    expect(await cliente.auth.getSession()).toEqual({ data: { session: null }, error: null });
  });
  it("N38 el servicio de autenticación no contesta: no se corta la sesión que el navegador ya tenía", async () => {
    // Un error sin estado es una falla pasajera del servicio, no un rechazo de
    // credenciales: cortar aquí sacaría de su sesión a quien ya estaba dentro
    // (revisión interna de la ronda 1 del tramo 4).
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(HORA), servicioCaido: true });
    expect(await entrar(cliente, credenciales, SITIO, SITIO, AHORA)).toEqual({
      estado: "rechazada",
      codigo: 401,
      mensaje: MENSAJE_UNICO,
    });
    expect(anotado.signOut).toEqual([]);
    expect(await cliente.auth.getSession()).not.toEqual({ data: { session: null }, error: null });
  });
  it("N37 si la base falla al comprobar el usuario, la sesión recién creada se retira y se informa", async () => {
    const { cliente, anotado } = clienteFalso({
      credencialesValidas: true,
      paseAlEntrar: paseDeHace(0),
      errorDeBase: true,
    });
    await expect(entrar(cliente, credenciales, SITIO, SITIO, AHORA)).rejects.toThrow("No se pudo comprobar la sesión");
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
    expect(await cliente.auth.getSession()).toEqual({ data: { session: null }, error: null });
  });
  it("P15 el mensaje único está en español y es uno solo", () => {
    expect(MENSAJE_UNICO).toMatch(/correo|contraseña/);
  });
});

describe("cerrar: el pase deja de servir, y solo desde el propio sitio", () => {
  it("P16 desde el propio sitio cierra la sesión de este navegador en el servicio", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(HORA) });
    expect(await cerrar(cliente, SITIO, SITIO)).toEqual({ estado: "cerrada" });
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N29 cierre desde otro sitio o sin origen: se rechaza y la sesión sigue abierta", async () => {
    for (const origen of ["https://otro.example.com", undefined]) {
      const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(HORA) });
      expect(await cerrar(cliente, origen, SITIO)).toEqual(ORIGEN_RECHAZADO);
      expect(anotado.signOut).toEqual([]);
    }
  });
  it("P19 el servicio no revoca el pase pero la sesión del navegador ya se cerró: queda cerrada", async () => {
    // El cliente oficial con alcance local borra la sesión antes de pedir la
    // revocación, así que su error no significa que el navegador siga dentro.
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(HORA), cierreFalla: "error" });
    expect(await cerrar(cliente, SITIO, SITIO)).toEqual({ estado: "cerrada" });
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
    expect(await cliente.auth.getSession()).toEqual({ data: { session: null }, error: null });
  });
  it("P20 la llamada de cierre falla y la sesión ya no está: también queda cerrada", async () => {
    const { cliente } = clienteFalso({ sesion: paseDeHace(HORA), cierreFalla: "excepcion" });
    expect(await cerrar(cliente, SITIO, SITIO)).toEqual({ estado: "cerrada" });
  });
  it("N33 el cierre falla y la sesión sigue viva en el navegador: no se dice «cerrada»", async () => {
    const { cliente, anotado } = clienteFalso({ sesion: paseDeHace(HORA), cierreFalla: "vive" });
    expect(await cerrar(cliente, SITIO, SITIO)).toEqual(NO_SE_CERRO);
    expect(anotado.signOut).toEqual([{ scope: "local" }]);
  });
  it("N34 el cierre falla, la sesión sigue viva y además no se puede comprobar: no se dice «cerrada»", async () => {
    const { cliente } = clienteFalso({ sesion: paseDeHace(HORA), cierreFalla: "vive", errorAlComprobarCierre: true });
    expect(await cerrar(cliente, SITIO, SITIO)).toEqual(NO_SE_CERRO);
  });
});
