// HU-01.2 · La sesión con el cliente oficial del servicio y la base local.
// Origen: openspec/specs/acceso/spec.md, requisitos «Entrar con cuenta activa»,
// «Mensaje único ante credenciales incorrectas», «Sesión vigente», «Cerrar la
// sesión» y «Peticiones que vienen de otro sitio» (escenario «marcas de la
// cookie»).
//
// Necesita la base local levantada (scripts/base/levantar-base.sh) y la
// variable CT_BASE_LOCAL=1; sin ella no corre, para que `pnpm test` siga
// sirviendo sin Docker.
//
//   CT_BASE_LOCAL=1 pnpm vitest run tests/integration/sesion.test.ts
//
// La corre también la integración continua, en el trabajo de la base, que es
// el que levanta la base (hallazgo F de la ronda 1 del tramo 4): es la única
// prueba que pasa por el cliente oficial, así que sin ella un cambio en ese
// cableado —cómo se escriben y se borran las cookies— podía romperse con todo
// en verde.
//
// Crea cuentas de prueba con correo de example.com y una organización de
// prueba, que quita al terminar.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearCliente, type Galletero, type OpcionesDeCookie } from "@/lib/sesion/cliente";
import { MENSAJE_UNICO } from "@/lib/sesion/reglas";
import { cerrar, entrar, sesionVigente } from "@/lib/sesion/vigente";

const ACTIVA = process.env.CT_BASE_LOCAL === "1";
// Donde esta suite es obligatoria —el trabajo de la base en la integración
// continua— se pone también esta variable. Sin ella, una suite saltada sale en
// verde y no prueba nada: el caso I7 lo impide.
const EXIGIDA = process.env.CT_INTEGRACION_EXIGIDA === "1";
const RAIZ = join(__dirname, "..", "..");
const SITIO = "http://localhost:3000";

function entorno(): Record<string, string> {
  const salida = execFileSync("supabase", ["status", "-o", "env"], { cwd: RAIZ, encoding: "utf8" });
  return Object.fromEntries(
    salida
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
      }),
  );
}

function psql(sql: string): string {
  const proyecto = /^project_id\s*=\s*"([^"]+)"/m.exec(readFileSync(join(RAIZ, "supabase", "config.toml"), "utf8"))?.[1];
  return execFileSync(
    "docker",
    ["exec", "-i", `supabase_db_${proyecto}`, "psql", "-U", "postgres", "-d", "postgres", "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"],
    { input: sql, encoding: "utf8" },
  ).trim();
}

/** Las cookies de un navegador: lo que el sistema escribe, con sus marcas. */
function navegador() {
  const guardadas = new Map<string, { valor: string; opciones: OpcionesDeCookie }>();
  const galletero: Galletero = {
    getAll: () => [...guardadas].map(([name, g]) => ({ name, value: g.valor })),
    set: (nombre, valor, opciones) => {
      if (!valor || opciones.maxAge === 0) guardadas.delete(nombre);
      else guardadas.set(nombre, { valor, opciones });
    },
  };
  return { galletero, guardadas };
}

describe.runIf(EXIGIDA)("esta suite no se salta donde es obligatoria", () => {
  it("I7 donde se exige, la base local está declarada y la suite corre", () => {
    expect(ACTIVA).toBe(true);
  });
});

describe.skipIf(!ACTIVA)("sesión con el cliente oficial y la base local", () => {
  let env: Record<string, string> = {};
  let org = "";
  const cuentas: string[] = [];
  const persona = { id: "", correo: `prueba-${randomUUID()}@example.com`, contrasena: `Prueba-${randomUUID()}` };
  const sinUsuario = { correo: `prueba-${randomUUID()}@example.com`, contrasena: `Prueba-${randomUUID()}` };
  const config = () => ({ url: env.API_URL, clave: env.ANON_KEY, direccionPublica: SITIO });

  async function crearCuenta(correo: string, contrasena: string): Promise<string> {
    const r = await fetch(`${env.API_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: env.SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: correo, password: contrasena, email_confirm: true }),
    });
    const cuerpo = await r.json();
    if (!r.ok) throw new Error(`No se pudo crear la cuenta de prueba (${r.status}): ${JSON.stringify(cuerpo)}`);
    cuentas.push(cuerpo.id);
    return cuerpo.id;
  }

  beforeAll(async () => {
    env = entorno();
    org = psql(`insert into public.organizacion (nombre, zona_horaria) values ('Organización ${randomUUID()}', 'America/Panama') returning id;`);
    persona.id = await crearCuenta(persona.correo, persona.contrasena);
    await crearCuenta(sinUsuario.correo, sinUsuario.contrasena);
    psql(
      `insert into public.usuario (id, organizacion_id, nombre, correo, telefono) values ('${persona.id}', '${org}', 'Persona', '${persona.correo}', '+507 6000-0000');`,
    );
  });

  afterAll(async () => {
    if (org) {
      psql(`delete from public.usuario where organizacion_id = '${org}'; delete from public.organizacion where id = '${org}';`);
    }
    for (const id of cuentas) {
      await fetch(`${env.API_URL}/auth/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: { apikey: env.SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SERVICE_ROLE_KEY}` },
      });
    }
  });

  it("I1 entra con cuenta activa; la cookie no la lee la página y no declara dominio", async () => {
    const { galletero, guardadas } = navegador();
    const r = await entrar(crearCliente(config(), galletero), persona, SITIO, SITIO);
    expect(r).toEqual({ estado: "dentro", identidad: { usuarioId: persona.id, organizacionId: org } });
    expect(guardadas.size).toBeGreaterThan(0);
    for (const { opciones } of guardadas.values()) {
      expect(opciones.httpOnly).toBe(true);
      expect("domain" in opciones).toBe(false);
    }
  });

  it("I2 en la petición siguiente, con las mismas cookies, la sesión sigue vigente sin credenciales", async () => {
    const { galletero } = navegador();
    await entrar(crearCliente(config(), galletero), persona, SITIO, SITIO);
    expect(await sesionVigente(crearCliente(config(), galletero))).toEqual({ usuarioId: persona.id, organizacionId: org });
  });

  it("I3 contraseña incorrecta y cuenta sin usuario: el mismo mensaje, sin cookie de sesión", async () => {
    const a = navegador();
    const b = navegador();
    const mala = await entrar(crearCliente(config(), a.galletero), { ...persona, contrasena: "otra" }, SITIO, SITIO);
    const sin = await entrar(crearCliente(config(), b.galletero), sinUsuario, SITIO, SITIO);
    expect(mala).toEqual({ estado: "rechazada", codigo: 401, mensaje: MENSAJE_UNICO });
    expect(sin).toEqual(mala);
    expect(a.guardadas.size).toBe(0);
    expect(b.guardadas.size).toBe(0);
  });

  it("I4 la cuenta se desactiva con la sesión abierta: la siguiente petición se rechaza y las cookies se borran", async () => {
    const { galletero, guardadas } = navegador();
    await entrar(crearCliente(config(), galletero), persona, SITIO, SITIO);
    psql(`update public.usuario set activo = false where id = '${persona.id}';`);
    try {
      expect(await sesionVigente(crearCliente(config(), galletero))).toBeNull();
      expect(guardadas.size).toBe(0);
    } finally {
      psql(`update public.usuario set activo = true where id = '${persona.id}';`);
    }
  });

  it("I5 al cerrar, el pase que tenía deja de servir en el servicio", async () => {
    const { galletero, guardadas } = navegador();
    const cliente = crearCliente(config(), galletero);
    await entrar(cliente, persona, SITIO, SITIO);
    const { data } = await cliente.auth.getSession();
    const pase = data.session?.access_token ?? "";
    expect(await cerrar(cliente, SITIO, SITIO)).toEqual({ estado: "cerrada" });
    expect(guardadas.size).toBe(0);
    const r = await fetch(`${env.API_URL}/auth/v1/user`, { headers: { apikey: env.ANON_KEY, Authorization: `Bearer ${pase}` } });
    expect([401, 403]).toContain(r.status);
  });

  it("I6 un cierre desde otro sitio no cierra nada", async () => {
    const { galletero } = navegador();
    await entrar(crearCliente(config(), galletero), persona, SITIO, SITIO);
    await cerrar(crearCliente(config(), galletero), "https://otro.example.com", SITIO);
    expect(await sesionVigente(crearCliente(config(), galletero))).not.toBeNull();
  });
});
