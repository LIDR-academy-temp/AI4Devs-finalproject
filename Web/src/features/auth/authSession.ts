import { usuarioIdFromJwt } from './jwtSub'

export type AuthSession = {
  token: string
  usuarioId: number
  expira: string
  perfil: string
  nombre: string
  requiereCambioPassword: boolean
}

export type LoginResponse = {
  token: string
  expira: string
  perfil: string
  nombre: string
  requiereCambioPassword: boolean
}

export function sessionFromLoginResponse(data: LoginResponse): AuthSession | null {
  const usuarioId = usuarioIdFromJwt(data.token)
  if (usuarioId === null) {
    return null
  }
  return {
    token: data.token,
    usuarioId,
    expira: data.expira,
    perfil: data.perfil,
    nombre: data.nombre,
    requiereCambioPassword: data.requiereCambioPassword,
  }
}
