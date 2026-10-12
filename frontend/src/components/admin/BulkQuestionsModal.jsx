import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { adminApi } from '../../lib/adminApi'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

const HEADER = ['question', 'type', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'difficulty', 'marks', 'negative_marks']

const TEMPLATE = [
  HEADER,
  ['Which keyword is used to create an object in Java?', 'mcq', 'new', 'create', 'make', 'object', 'A', 'easy', '1', '0'],
  ['Which of these is NOT a Java primitive type?', 'mcq', 'int', 'boolean', 'String', 'double', 'C', 'easy', '1', '0'],
  ['What is the default value of an int field in a Java class?', 'mcq', 'null', '1', 'undefined', '0', 'D', 'medium', '1', '0'],
  ['Java supports multiple inheritance of classes.', 'true_false', '', '', '', '', 'False', 'medium', '1', '0'],
]

// Small CSV reader: handles quoted cells, commas and line breaks inside quotes
function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

function toObjects(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return rows.slice(1).map((cells) => {
    const o = {}
    head.forEach((h, i) => { o[h] = (cells[i] ?? '').trim() })
    return { ...o, question_type: o.type || o.question_type || 'mcq' }
  })
}

const toCsv = (rows) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')

/**
 * Bulk upload for the Question Bank tab. The admin picks the skill once and
 * adds many questions from a CSV / pasted rows.
 */
function BulkQuestionsModal({ skills, onClose, onDone }) {
  const [skillId, setSkillId] = useState('')
  const [text, setText] = useState('')
  const [auto, setAuto] = useState(true)
  const [duration, setDuration] = useState('10')
  const [passing, setPassing] = useState('50')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const rows = toObjects(text)
  const skill = skills.find((s) => s.id === skillId)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setText(await file.text())
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const blob = new Blob([toCsv(TEMPLATE)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'questions-template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const submit = async () => {
    setError('')
    setResult(null)
    if (!skill) return setError('Choose the skill these questions belong to.')
    if (!rows.length) return setError('Upload or paste questions first. The first row must be the header.')
    try {
      setBusy(true)
      const data = await adminApi('questions/bulk', {
        method: 'POST',
        body: {
          rows: rows.map((r) => ({ ...r, skill: skill.name })),
          ...(auto ? { create_assessments: { duration_minutes: Number(duration) || 10, passing_percentage: Number(passing) || 50 } } : {}),
        },
      })
      setResult(data)
      onDone?.(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bulk upload questions</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a skill, then add many questions at once.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><FiX size={20} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Skill *</label>
            <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className={inputClass}>
              <option value="">Select skill</option>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={downloadTemplate} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              ⬇ Download template (with examples)
            </button>
            <label className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Upload CSV file
              <input type="file" accept=".csv,.txt" onChange={onFile} className="sr-only" />
            </label>
            <span className="text-sm text-slate-500">{rows.length} question(s) ready</span>
          </div>

          <div>
            <p className="mb-2 text-xs text-slate-500">
              Columns: <b>{HEADER.join(', ')}</b>. Type is mcq or true_false (also fill_in_blank, programming).
              For mcq the correct answer is A, B, C or D; for true_false it is True or False. Edit the template in Excel and save as CSV, or paste rows here.
            </p>
            <textarea rows="8" value={text} onChange={(e) => setText(e.target.value)} placeholder={HEADER.join(',')} className={`${inputClass} font-mono`} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Also create an assessment for this skill from these questions
          </label>
          {auto && (
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Duration (minutes)</label>
                <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" min="1" className={`${inputClass} w-32`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Passing percentage</label>
                <input value={passing} onChange={(e) => setPassing(e.target.value)} type="number" min="0" max="100" className={`${inputClass} w-32`} />
              </div>
            </div>
          )}

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {result && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {result.created} added{result.failed ? `, ${result.failed} skipped` : ''}
              </p>
              {result.assessments?.map((a) => (
                <p key={a.title} className={a.status === 'error' ? 'mt-1 text-red-600' : 'mt-1 text-slate-600'}>
                  Assessment “{a.title}”: {a.status}{a.message ? ` — ${a.message}` : ''}
                </p>
              ))}
              {result.errors?.length > 0 && (
                <div className="mt-3 max-h-40 overflow-auto text-red-700">
                  {result.errors.map((e, i) => <p key={i}>Row {e.line}: {e.message}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            {result ? 'Close' : 'Cancel'}
          </button>
          <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Adding…' : `Add ${rows.length || ''} question(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkQuestionsModal
