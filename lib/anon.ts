/**
 * Returns a stable anonymous ID for the current device.
 * Generated once and persisted in localStorage as 'rasa_anon_id'.
 * Must be called client-side only — localStorage is unavailable on the server.
 */
export function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('rasa_anon_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('rasa_anon_id', id)
  }
  return id
}
