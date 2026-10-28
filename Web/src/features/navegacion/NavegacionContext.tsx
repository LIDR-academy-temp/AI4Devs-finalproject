import { createContext, useContext, type ReactNode } from 'react'
import { useNavegacionMenus, type NavegacionState } from './useNavegacionMenus'

const NavegacionContext = createContext<NavegacionState | undefined>(undefined)

export function NavegacionProvider({ children }: { children: ReactNode }) {
  const value = useNavegacionMenus()
  return <NavegacionContext.Provider value={value}>{children}</NavegacionContext.Provider>
}

export function useNavegacion(): NavegacionState {
  const ctx = useContext(NavegacionContext)
  if (!ctx) {
    throw new Error('useNavegacion debe usarse dentro de NavegacionProvider')
  }
  return ctx
}
