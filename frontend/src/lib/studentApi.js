import { supabase } from './supabase'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/$/, '')

/**
 * Calls the Student API (/api/student/...) with the signed-in user's token.
 * Returns the parsed JSON ({ success, data, ... }) or throws an Error with a
 * readable message. Pass `rawBody` (a File/Blob) to upload bytes as-is.
 */
export async function studentApi(
  path,
  { method = 'GET', body, rawBody, headers = {} } = {}
) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Your session has expired. Please sign in again.')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/student/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(rawBody ? { body: rawBody } : body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.success === false) {
    const err = new Error(result.message || `Request failed (${response.status}).`)
    err.status = response.status
    err.reasons = result.reasons
    err.data = result.data
    throw err
  }
  return result
}
