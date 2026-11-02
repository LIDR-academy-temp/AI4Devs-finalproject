import { compose } from './pila.ts'

export default function cierreGlobal() {
  compose('down', '-v')
}
