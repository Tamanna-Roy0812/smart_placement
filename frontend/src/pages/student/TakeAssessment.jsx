import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { studentApi } from '../../lib/studentApi'
import { Card, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { useAsync } from '../../components/student/helpers'

async function load(id) {
  const [a, q] = await Promise.all([studentApi(`assessments/${id}`), studentApi(`assessments/${id}/questions`)])
  const questions = (q.data || []).map((x) => x.questions).filter(Boolean)
  return { assessment: a.data, questions }
}

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function optionList(q) {
  if (q.question_type === 'true_false') return [['True', 'True'], ['False', 'False']]
  if (q.question_type === 'mcq' && q.options) {
    return Object.entries(q.options).filter(([, text]) => text)
  }
  return null // free text
}

function TakeAssessment() {
  const { id } = useParams()
  const { data, loading, error } = useAsync(() => load(id))
  const [phase, setPhase] = useState('intro') // intro | running | done
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [deadline, setDeadline] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [result, setResult] = useState(null)

  const questions = data?.questions || []
  const assessment = data?.assessment

  const start = async () => {
    try {
      setBusy(true)
      setProblem('')
      const r = await studentApi(`assessments/${id}/attempts`, { method: 'POST' })
      setAttempt(r.data)
      const total = Math.max(1, Number(assessment.duration_minutes || 30)) * 60
      setSecondsLeft(total)
      setDeadline(Date.now() + total * 1000)
      setPhase('running')
    } catch (e) {
      setProblem(e.message)
    } finally {
      setBusy(false)
    }
  }

  const saveAnswer = async (question, value) => {
    setAnswers((a) => ({ ...a, [question.id]: value }))
    try {
      await studentApi(`assessments/${id}/attempts/${attempt.id}/answers`, {
        method: 'POST',
        body: { question_id: question.id, selected_answer: value },
      })
    } catch (e) {
      setProblem(`Answer not saved: ${e.message}`)
    }
  }

  const submit = useCallback(async () => {
    if (!attempt) return
    try {
      setBusy(true)
      setProblem('')
      const r = await studentApi(`assessments/${id}/attempts/${attempt.id}/complete`, { method: 'PATCH' })
      setResult(r.data)
      setPhase('done')
    } catch (e) {
      setProblem(e.message)
    } finally {
      setBusy(false)
    }
  }, [attempt, id])

  useEffect(() => {
    if (phase !== 'running') return undefined
    const timer = setInterval(() => {
      const left = Math.round((deadline - Date.now()) / 1000)
      setSecondsLeft(left)
      if (left <= 0) {
        clearInterval(timer)
        submit()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, deadline, submit])

  if (loading) return <div className="p-6 md:p-8"><Loading /></div>
  if (error || !assessment) {
    return (
      <div className="p-6 md:p-8">
        <ErrorBox message={error || 'Assessment not found.'} />
        <Link to="/student/assessments" className="text-sm font-medium text-blue-600">← Back to assessments</Link>
      </div>
    )
  }

  if (phase === 'done') {
    const pct = Number(result?.percentage || 0)
    const pass = pct >= Number(assessment.passing_percentage || 0)
    return (
      <div className="p-6 md:p-8">
        <PageHeader title="Assessment submitted" subtitle={assessment.title} />
        <Card className="max-w-xl text-center">
          <p className="text-5xl font-bold text-slate-900">{pct.toFixed(1)}%</p>
          <p className={`mt-2 text-lg font-semibold ${pass ? 'text-emerald-600' : 'text-amber-600'}`}>
            {pass ? 'You passed 🎉' : `Below the pass mark of ${assessment.passing_percentage}%`}
          </p>
          <p className="mt-1 text-sm text-slate-500">Score: {result?.score} marks. Your highest result is saved to your skill scores.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/student/results" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">See results</Link>
            <Link to="/student/assessments" className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700">All assessments</Link>
          </div>
        </Card>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="p-6 md:p-8">
        <PageHeader title={assessment.title} subtitle={assessment.description} />
        <Card className="max-w-xl">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>⏱ Time limit: <b>{assessment.duration_minutes} minutes</b> — it submits automatically when time is up.</li>
            <li>❓ Questions: <b>{questions.length}</b></li>
            <li>✅ Pass mark: <b>{assessment.passing_percentage}%</b></li>
            {assessment.negative_marking && <li>⚠️ Wrong answers lose marks.</li>}
            <li>💾 Each answer is saved as you go. Your highest score counts.</li>
          </ul>
          <ErrorBox message={problem} />
          {questions.length === 0 ? (
            <p className="mt-4 text-sm text-red-600">This assessment has no questions yet.</p>
          ) : (
            <button
              onClick={start}
              disabled={busy}
              className="mt-5 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? 'Starting…' : 'Start assessment'}
            </button>
          )}
        </Card>
      </div>
    )
  }

  const q = questions[index]
  const options = optionList(q)
  const answered = Object.keys(answers).length

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{assessment.title}</h1>
          <p className="text-sm text-slate-500">Question {index + 1} of {questions.length} · {answered} answered</p>
        </div>
        <span className={`rounded-xl px-4 py-2 font-mono text-lg font-bold ${secondsLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-800'}`}>
          {clock(Math.max(0, secondsLeft))}
        </span>
      </div>

      <Card className="max-w-3xl">
        <p className="whitespace-pre-line text-lg font-medium text-slate-900">{q.question}</p>
        <p className="mt-1 text-xs text-slate-400">{q.marks} mark(s)</p>

        <div className="mt-5 space-y-3">
          {options ? (
            options.map(([key, text]) => (
              <button
                key={key}
                type="button"
                onClick={() => saveAnswer(q, key)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                  answers[q.id] === key ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{key}</span>
                {text}
              </button>
            ))
          ) : (
            <textarea
              rows="4"
              value={answers[q.id] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              onBlur={(e) => e.target.value.trim() && saveAnswer(q, e.target.value.trim())}
              placeholder="Type your answer"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          )}
        </div>

        <ErrorBox message={problem} />

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            Previous
          </button>
          {index < questions.length - 1 ? (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white"
            >
              Next
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Submitting…' : 'Submit assessment'}
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}

export default TakeAssessment
