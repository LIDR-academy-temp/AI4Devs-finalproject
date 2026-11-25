// HU-03.2 · Separación por organización en el código.
// Origen: openspec/specs/acceso/spec.md, requisito «Separación por organización
// en el código» (HU-03.CA-1, CA-3, CA-4; D-59) y D-67 (lo ajeno responde como
// inexistente). Cada pieza con un caso que pasa y uno que se rechaza.
//
// La base se reemplaza por un cliente falso que anota los filtros que recibe:
// aquí se prueba la regla del código. Con la base real y dos organizaciones lo
// prueba HU-03.3 (tramo 7).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NO_EXISTE,
  buscarPorId,
  consultar,
  usosDirectos,
  type Identidad,
} from "@/lib/datos/separacion";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const FILA = "33333333-3333-4333-8333-333333333333";
const yo: Identidad = { usuarioId: "44444444-4444-4444-8444-444444444444", organizacionId: ORG_A };

type Resultado = { data: unknown; error: { message: string; code?: string } | null };

// Cliente falso: anota la tabla, las columnas y cada filtro, y devuelve lo que
// se le diga. Imita la forma del cliente oficial (from → select → eq → maybeSingle).
function clienteFalso(resultado: Resultado = { data: null, error: null }) {
  const anotado = { tabla: "", columnas: "", filtros: [] as [string, string][] };
  const consulta = {
    eq(columna: string, valor: string) {
      anotado.filtros.push([columna, valor]);
      return consulta;
    },
    async maybeSingle() {
      return resultado;
    },
  };
  const cliente = {
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

describe("consultar: toda consulta sale filtrada por la organización de quien pregunta", () => {
  it("P1 una tabla de negocio se filtra por organizacion_id", () => {
    const { cliente, anotado } = clienteFalso();
    consultar(cliente, yo, "usuario");
    expect(anotado.tabla).toBe("usuario");
    expect(anotado.filtros).toEqual([["organizacion_id", ORG_A]]);
  });

  it("P2 la tabla organizacion se filtra por su propio id", () => {
    const { cliente, anotado } = clienteFalso();
    consultar(cliente, yo, "organizacion");
    expect(anotado.filtros).toEqual([["id", ORG_A]]);
  });

  it("N1 sin organización de quien pregunta no se arma ninguna consulta", () => {
    const { cliente, anotado } = clienteFalso();
    expect(() => consultar(cliente, { ...yo, organizacionId: "" }, "usuario")).toThrow(
      /sin la organización de quien pregunta/,
    );
    expect(anotado.tabla).toBe("");
  });

  it("N2 una organización que no es un identificador válido tampoco", () => {
    const { cliente, anotado } = clienteFalso();
    expect(() => consultar(cliente, { ...yo, organizacionId: "' or 1=1 --" }, "usuario")).toThrow(
      /sin la organización de quien pregunta/,
    );
    expect(anotado.tabla).toBe("");
  });

  it("N3 una tabla que no está en la lista no se consulta", () => {
    const { cliente, anotado } = clienteFalso();
    expect(() => consultar(cliente, yo, "tabla_nueva" as never)).toThrow(/no está en la lista/);
    expect(anotado.tabla).toBe("");
  });
});

describe("buscarPorId: lo ajeno responde igual que lo que no existe (D-67)", () => {
  it("P3 un dato propio se recibe", async () => {
    const fila = { id: FILA, organizacion_id: ORG_A, nombre: "Ana" };
    const { cliente, anotado } = clienteFalso({ data: fila, error: null });
    const r = await buscarPorId(cliente, yo, "usuario", FILA);
    expect(r).toEqual({ estado: "encontrado", dato: fila });
    expect(anotado.filtros).toEqual([
      ["organizacion_id", ORG_A],
      ["id", FILA],
    ]);
  });

  it("N4 un dato de otra organización responde exactamente lo mismo que uno que no existe", async () => {
    // La base no devuelve la fila ajena: el filtro de organización la deja fuera.
    const ajeno = await buscarPorId(clienteFalso({ data: null, error: null }).cliente, yo, "usuario", FILA);
    const inexistente = await buscarPorId(
      clienteFalso({ data: null, error: null }).cliente,
      yo,
      "usuario",
      "55555555-5555-4555-8555-555555555555",
    );
    expect(ajeno).toEqual(NO_EXISTE);
    expect(inexistente).toEqual(ajeno);
  });

  it("N5 si la base devolviera una fila de otra organización, tampoco se entrega", async () => {
    const ajena = { id: FILA, organizacion_id: ORG_B, nombre: "Beto" };
    const r = await buscarPorId(clienteFalso({ data: ajena, error: null }).cliente, yo, "usuario", FILA);
    expect(r).toEqual(NO_EXISTE);
  });

  it("N6 un identificador mal formado responde como inexistente y no consulta", async () => {
    const { cliente, anotado } = clienteFalso();
    expect(await buscarPorId(cliente, yo, "usuario", "no-es-un-id")).toEqual(NO_EXISTE);
    expect(anotado.tabla).toBe("");
  });

  it("N7 un error de la base no se disfraza de «no existe»: se informa con mensaje nuestro", async () => {
    const { cliente } = clienteFalso({ data: null, error: { message: "connection refused" } });
    await expect(buscarPorId(cliente, yo, "usuario", FILA)).rejects.toThrow(
      /No se pudo consultar usuario/,
    );
  });

  it("N11 el mensaje de error es fijo: no muestra el texto del motor, que queda como causa", async () => {
    const interno = 'relation "usuario" does not exist';
    const { cliente } = clienteFalso({ data: null, error: { message: interno } });
    const error = await buscarPorId(cliente, yo, "usuario", FILA).then(
      () => null,
      (e: Error) => e,
    );
    expect(error?.message).toBe("No se pudo consultar usuario. Inténtalo de nuevo en unos minutos.");
    expect(error?.message).not.toContain(interno);
    // La causa guarda el error entero del cliente (mensaje, código, detalle).
    const causa = (error as Error & { cause?: { message?: string } })?.cause;
    expect(causa?.message).toBe(interno);
  });

  it("P6 el mismo identificador de organización en mayúsculas sigue siendo propio", async () => {
    // Con letras: un identificador solo de dígitos no cambia al pasarlo a mayúsculas.
    const ORG_C = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    const fila = { id: FILA, organizacion_id: ORG_C, nombre: "Ana" };
    const { cliente, anotado } = clienteFalso({ data: fila, error: null });
    const r = await buscarPorId(cliente, { ...yo, organizacionId: ORG_C.toUpperCase() }, "usuario", FILA);
    expect(r).toEqual({ estado: "encontrado", dato: fila });
    expect(anotado.filtros[0]).toEqual(["organizacion_id", ORG_C]);
  });

  it("P4 la propia organización se recibe por su id", async () => {
    const org = { id: ORG_A, nombre: "Organización A" };
    const r = await buscarPorId(clienteFalso({ data: org, error: null }).cliente, yo, "organizacion", ORG_A);
    expect(r).toEqual({ estado: "encontrado", dato: org });
  });

  it("N8 otra organización por su id responde como inexistente", async () => {
    const otra = { id: ORG_B, nombre: "Organización B" };
    const r = await buscarPorId(clienteFalso({ data: otra, error: null }).cliente, yo, "organizacion", ORG_B);
    expect(r).toEqual(NO_EXISTE);
  });
});

describe("en un solo lugar: el código no consulta tablas por fuera del módulo de separación", () => {
  const RAIZ = join(__dirname, "..", "..");
  const MODULO = join("lib", "datos", "separacion.ts");

  // Dependencias, compilados y git se saltan a cualquier profundidad; de las
  // pruebas, solo la carpeta tests/ de la raíz (revisión interna del tramo 3).
  const NO_SE_RECORREN = new Set(["node_modules", ".next", ".git"]);
  const PRUEBAS = join(RAIZ, "tests");

  function archivos(dir: string): string[] {
    let salida: string[] = [];
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (NO_SE_RECORREN.has(nombre) || ruta === PRUEBAS) continue;
      if (statSync(ruta).isDirectory()) salida = salida.concat(archivos(ruta));
      else if (/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(nombre)) salida.push(ruta);
    }
    return salida;
  }

  it("P5 ningún archivo de código del repositorio, fuera del módulo, consulta tablas ni funciones", () => {
    // Todo el repositorio, no solo app/ y lib/ (revisión del tramo 3, ronda 1).
    // Fuera: dependencias, compilados, git y las pruebas, que usan clientes falsos.
    const fuera = archivos(RAIZ)
      .filter((ruta) => relative(RAIZ, ruta) !== MODULO)
      .filter((ruta) => usosDirectos(readFileSync(ruta, "utf8")) > 0)
      .map((ruta) => relative(RAIZ, ruta));
    expect(fuera).toEqual([]);
  });

  it("N9 control: el detector sí ve una consulta directa, con o sin espacios", () => {
    expect(usosDirectos('const r = await supabase.from("usuario").select();')).toBe(1);
    expect(usosDirectos("db\n  .from ( 'aviso_inicio' )")).toBe(1);
    expect(usosDirectos("Array.from(lista); // no es una consulta")).toBe(0);
  });

  it("N10 control: también la ve con la tabla en una variable, por corchetes o como función (rpc)", () => {
    expect(usosDirectos("const tabla = 'usuario'; supabase.from(tabla).select();")).toBe(1);
    expect(usosDirectos('supabase["from"]("usuario").select();')).toBe(1);
    expect(usosDirectos("supabase['rpc']('registrar_aviso', {});")).toBe(1);
    expect(usosDirectos("await supabase.rpc(nombre, datos);")).toBe(1);
  });

  it("P7 control: no confunde con consultas lo que no lo es", () => {
    expect(usosDirectos("Buffer.from(texto); Uint8Array.from(bytes); Array.from(conjunto);")).toBe(0);
    expect(usosDirectos("import { x } from './y';")).toBe(0);
  });
});
