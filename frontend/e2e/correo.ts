import { PUERTO_CORREO, URL_E2E } from './pila.ts'

/** Con 127.0.0.1 y no "localhost": Mailpit solo escucha en IPv4. */
const MAILPIT = `http://127.0.0.1:${PUERTO_CORREO}/api/v1`

export interface Correo {
  asunto: string
  texto: string
  cabeceras: Record<string, string[]>
}

interface Resumen {
  ID: string
  Subject: string
}

/**
 * Espera el correo con ese asunto para ese destinatario. El worker envía la bandeja de salida
 * cada 10 segundos, así que puede tardar un poco.
 */
export async function esperarCorreo(destinatario: string, asunto: string, plazoMs = 45_000): Promise<Correo> {
  const limite = Date.now() + plazoMs
  const consulta = new URLSearchParams({ query: `to:"${destinatario}" subject:"${asunto}"` })
  while (Date.now() < limite) {
    const respuesta = await fetch(`${MAILPIT}/search?${consulta}`)
    const { messages } = (await respuesta.json()) as { messages: Resumen[] | null }
    const encontrado = messages?.find((mensaje) => mensaje.Subject === asunto)
    if (encontrado) {
      const mensaje = (await (await fetch(`${MAILPIT}/message/${encontrado.ID}`)).json()) as { Text: string }
      const cabeceras = (await (await fetch(`${MAILPIT}/message/${encontrado.ID}/headers`)).json()) as Record<
        string,
        string[]
      >
      return { asunto, texto: mensaje.Text, cabeceras }
    }
    await new Promise((listo) => setTimeout(listo, 1_000))
  }
  throw new Error(`No llegó el correo "${asunto}" a ${destinatario}`)
}

/** La ruta y el fragmento del enlace del correo que empieza con esa ruta, p. ej. "/confirmar". */
export function enlace(correo: Correo, ruta: string): string {
  const prefijo = `${new URL(URL_E2E).origin}${ruta}#codigo=`
  const linea = correo.texto.split(/\s+/).find((palabra) => palabra.startsWith(prefijo))
  if (!linea || !/^[A-Za-z0-9_-]+$/.test(linea.slice(prefijo.length))) {
    throw new Error(`El correo "${correo.asunto}" no trae un enlace a ${ruta}`)
  }
  return linea.slice(new URL(URL_E2E).origin.length)
}
