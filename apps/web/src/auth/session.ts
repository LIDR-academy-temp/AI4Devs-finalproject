/**
 * Almacenamiento de la sesión: token en memoria y copia en sessionStorage para sobrevivir a
 * una recarga de la pestaña (se descarta al cerrarla). Si sessionStorage no está disponible la
 * sesión vive solo en memoria.
 */
const STORAGE_KEY = 'concilia.token';

let memoryToken: string | null = null;

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setToken(token: string): void {
  memoryToken = token;
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* sin sessionStorage: solo memoria */
  }
}

export function clearSession(): void {
  memoryToken = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada que limpiar */
  }
}
