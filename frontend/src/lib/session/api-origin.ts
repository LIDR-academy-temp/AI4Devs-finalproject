/** Origin of the API; empty means same origin (the generated paths already carry /api/v1). */
export function apiOrigin(): string {
  return import.meta.env.VITE_API_URL || window.location.origin
}
