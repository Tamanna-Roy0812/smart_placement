import { useEffect, useState } from 'react'

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Runs an async loader on mount and whenever `reload()` is called.
 * Returns { data, loading, error, reload }.
 */
export function useAsync(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(loader)
      .then((data) => alive && setState({ data, loading: false, error: '' }))
      .catch((e) => alive && setState({ data: null, loading: false, error: e.message }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const reload = () => {
    setState((s) => ({ ...s, loading: true, error: '' }))
    setTick((t) => t + 1)
  }
  return { ...state, reload }
}
