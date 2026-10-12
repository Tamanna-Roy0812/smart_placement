import { supabase } from './supabase'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')

export async function adminApi(resource, { method = 'GET', id, body } = {}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const accessToken = sessionData?.session?.access_token
  if (!accessToken) throw new Error('Your session has expired. Please sign in again.')

  const suffix = id ? `/${encodeURIComponent(id)}` : ''
  const response = await fetch(`${API_BASE_URL}/admin/${resource}${suffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || `Request failed (${response.status}).`)
  }
  return result.data ?? result
}
