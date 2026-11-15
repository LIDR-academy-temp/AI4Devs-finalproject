import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { PaginaPublica } from '../componentes/PaginaPublica'
import { ReenvioConfirmacion } from '../componentes/ReenvioConfirmacion'
import { confirmarCuenta, mensajeDeError } from '../servicios/cliente'
import { useCodigoDelEnlace } from '../servicios/enlace'

type Estado = { tipo: 'confirmando' } | { tipo: 'confirmada'; mensaje: string } | { tipo: 'error'; mensaje: string }

const SIN_CODIGO = 'El enlace está incompleto. Ábralo directamente desde el correo.'

export function Confirmar() {
  const codigo = useCodigoDelEnlace()
  const [estado, setEstado] = useState<Estado>(
    codigo ? { tipo: 'confirmando' } : { tipo: 'error', mensaje: SIN_CODIGO },
  )
  // El código es de un solo uso: en desarrollo, React ejecuta dos veces los efectos.
  const pedido = useRef(false)

  useEffect(() => {
    if (!codigo || pedido.current) {
      return
    }
    pedido.current = true
    confirmarCuenta(codigo)
      .then(({ mensaje }) => setEstado({ tipo: 'confirmada', mensaje }))
      .catch((fallo: unknown) => setEstado({ tipo: 'error', mensaje: mensajeDeError(fallo) }))
  }, [codigo])

  if (estado.tipo === 'confirmando') {
    return (
      <PaginaPublica titulo="Confirmación de la cuenta">
        <p role="status">Confirmando la cuenta…</p>
      </PaginaPublica>
    )
  }
  if (estado.tipo === 'confirmada') {
    return (
      <PaginaPublica titulo="Cuenta confirmada">
        <p role="status" className="aviso">
          {estado.mensaje}
        </p>
        <p>
          <Link to="/acceso">Ingresar</Link>
        </p>
      </PaginaPublica>
    )
  }
  return (
    <PaginaPublica titulo="No se pudo confirmar la cuenta">
      <p role="alert" className="error">
        {estado.mensaje}
      </p>
      <h2>Pedir un enlace nuevo</h2>
      <ReenvioConfirmacion />
    </PaginaPublica>
  )
}
