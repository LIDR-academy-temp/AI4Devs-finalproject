import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

/**
 * El código de los enlaces de los correos viaja después de `#`, que el navegador no envía al
 * servidor. Se lee una vez y se borra de la barra de direcciones, para que no quede en el historial
 * ni se comparta por error.
 */
export function useCodigoDelEnlace(): string | null {
  const { hash, pathname, search } = useLocation()
  const navegar = useNavigate()
  const [codigo] = useState(() => new URLSearchParams(hash.slice(1)).get('codigo'))

  useEffect(() => {
    if (hash) {
      void navegar(`${pathname}${search}`, { replace: true })
    }
  }, [hash, navegar, pathname, search])

  return codigo
}
