import { useState } from 'react'
import { adminApi } from '../../lib/adminApi'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

// Accepts lines like "a@x.com" or "a@x.com, Asha Verma" (also a CSV with a header row)
function parseRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, ...rest] = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ''))
      return { email, name: rest.join(' ').trim() }
    })
    .filter((r) => r.email && !/^e-?mail$/i.test(r.email))
}

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return ['email,name,password', ...rows.map((r) => [r.email, r.name, r.password].map(esc).join(','))].join('\n')
}

function BulkStudents() {
  const [text, setText] = useState('')
  const [mode, setMode] = useState('random')
  const [shared, setShared] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const rows = parseRows(text)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setText((t) => (t ? `${t}\n${content}` : content))
    e.target.value = ''
  }

  const submit = async () => {
    setError('')
    setResult(null)
    if (!rows.length) return setError('Add at least one email.')
    if (rows.length > 500) return setError('Please add at most 500 students at a time.')
    if (mode === 'same' && shared.trim().length < 6) {
      return setError('The shared password must be at least 6 characters.')
    }
    try {
      setBusy(true)
      const data = await adminApi('users/bulk', {
        method: 'POST',
        body: { rows, ...(mode === 'same' ? { password: shared.trim() } : {}) },
      })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    const created = result.results.filter((r) => r.status === 'created')
    const blob = new Blob([toCsv(created)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student-credentials.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">Admin Panel</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Bulk Add Students 👥</h1>
        <p className="mt-2 text-slate-500">
          Paste many emails at once. Each student gets an account and a password you can hand out.
        </p>
      </div>

      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Student emails (one per line, optionally followed by a comma and the name)
        </label>
        <textarea
          rows="10"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'asha@college.edu, Asha Verma\nravi@college.edu\n…'}
          className={inputClass}
        />
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">
            Upload a CSV / text file
            <input type="file" accept=".csv,.txt" onChange={onFile} className="sr-only" />
          </label>
          <span>{rows.length} student(s) ready</span>
        </div>

        <div className="mt-6 space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === 'random'} onChange={() => setMode('random')} />
            Generate a different random password for each student (recommended)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === 'same'} onChange={() => setMode('same')} />
            Use the same password for everyone
          </label>
          {mode === 'same' && (
            <input
              value={shared}
              onChange={(e) => setShared(e.target.value)}
              placeholder="e.g. Test@123"
              className={`${inputClass} max-w-xs`}
            />
          )}
          {mode === 'same' && (
            <p className="text-xs text-amber-600">
              A shared password is easy to guess. Ask students to change it after their first login (Forgot password).
            </p>
          )}
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? 'Creating accounts… (this can take a minute)' : `Create ${rows.length || ''} student account(s)`}
        </button>
      </div>

      {result && (
        <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">
              {result.created} created{result.failed ? `, ${result.failed} failed` : ''}
            </p>
            {result.created > 0 && (
              <button
                type="button"
                onClick={download}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Download credentials (CSV)
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-amber-600">
            Download the file now. Passwords are shown only on this screen and are not stored anywhere readable.
          </p>
          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Password</th><th className="px-4 py-3">Result</th></tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={`${r.email}-${i}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">{r.email}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{r.password || '—'}</td>
                    <td className={`px-4 py-3 ${r.status === 'created' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.status === 'created' ? 'Created' : r.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkStudents
