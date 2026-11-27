// HU-01.2 · El cliente oficial del servicio para el servidor, con la cookie
// escrita como pide la especificación.
// Origen: openspec/specs/acceso/spec.md, requisito «Peticiones que vienen de
// otro sitio» (la cookie: que no la lea la página, sin dominio y, en el
// sistema desplegado, solo por conexión cifrada) y decisiones de diseño
// «Sesión por cookie» e «Identidad ante la base».
// Pruebas: tests/unit/sesion.test.ts (las marcas) y, con la base local,
// tests/integration/sesion.test.ts.
//
// Comprobado al construir HU-01.2 (25/11/2026), en el código del cliente
// oficial (@supabase/ssr 0.12.7, DEFAULT_COOKIE_OPTIONS): por sí solo escribe
// la cookie con path «/», sameSite «lax», sin dominio y SIN la marca que impide
// que la lea la página (httpOnly en falso) ni la de conexión cifrada. Por eso
// toda cookie pasa por opcionesDeCookie antes de escribirse.
import { createServerClient } from "@supabase/ssr";
import { opcionesDeCookie, type OpcionesDeCookie } from "@/lib/sesion/reglas";

export type { OpcionesDeCookie };

/** Dónde lee y escribe cookies la petición (en Next.js, cookies() del servidor). */
export interface Galletero {
  getAll(): { name: string; value: string }[];
  set(nombre: string, valor: string, opciones: OpcionesDeCookie): void;
}

export interface Configuracion {
  /** Dirección de la API del servicio. */
  url: string;
  /** Clave pública del servicio: la de las personas, nunca la credencial del sistema. */
  clave: string;
  /** Dirección pública del sistema, con la que se compara el origen de cada petición. */
  direccionPublica: string;
}

/** El cliente de una petición: consulta con el pase de la persona que la hace, y nada más. */
export function crearCliente(config: Configuracion, galletas: Galletero) {
  return createServerClient(config.url, config.clave, {
    cookies: {
      getAll: () => galletas.getAll(),
      setAll: (porEscribir) => {
        for (const { name, value, options } of porEscribir) {
          galletas.set(name, value, opcionesDeCookie(options as OpcionesDeCookie, config.direccionPublica));
        }
      },
    },
  });
}
// Leer la configuración del entorno del servidor y unir este cliente con las
// cookies de Next.js es de HU-01.3, que construye las pantallas que lo usan.
