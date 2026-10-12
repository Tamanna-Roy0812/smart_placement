import { useState } from 'react'
import { studentApi } from '../../lib/studentApi'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { formatDate, useAsync } from '../../components/student/helpers'

async function loadAll() {
  const [jobs, apps] = await Promise.all([studentApi('jobs'), studentApi('applications')])
  const list = jobs.data || []
  // Eligibility for every open job (small list, one call each)
  const checks = await Promise.all(
    list.map((j) =>
      studentApi(`jobs/${j.id}/eligibility`)
        .then((r) => [j.id, r.data])
        .catch(() => [j.id, null])
    )
  )
  return {
    jobs: list,
    eligibility: Object.fromEntries(checks),
    applied: new Set((apps.data || []).map((a) => a.job_id)),
  }
}

function JobCard({ job, eligibility, applied, match, onApplied }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const eligible = eligibility?.eligible

  const apply = async () => {
    try {
      setBusy(true)
      setError('')
      await studentApi(`jobs/${job.id}/apply`, { method: 'POST' })
      onApplied()
    } catch (e) {
      setError(e.reasons?.length ? e.reasons.join(' ') : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{job.role}</h3>
          <p className="text-sm text-slate-500">
            {job.companies?.name || 'Company'}
            {job.location ? ` · ${job.location}` : ''}
            {job.employment_type ? ` · ${job.employment_type}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {match != null && <Chip tone="purple">{match}% match</Chip>}
          {eligibility && <Chip tone={eligible ? 'green' : 'red'}>{eligible ? 'Eligible' : 'Not eligible'}</Chip>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
        {job.salary != null && <span>💰 {Number(job.salary).toLocaleString()}</span>}
        <span>⏳ Apply by {formatDate(job.deadline)}</span>
        {job.minimum_cgpa != null && <span>🎓 Min CGPA {job.minimum_cgpa}</span>}
      </div>

      {(job.required_skills || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.required_skills.map((s) => <Chip key={s} tone="blue">{s}</Chip>)}
        </div>
      )}

      {open && job.description && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{job.description}</p>
      )}

      {eligibility && !eligible && eligibility.reasons?.length > 0 && (
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-red-600">
          {eligibility.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={apply}
          disabled={busy || applied || !eligible}
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applied ? 'Applied ✔' : busy ? 'Applying…' : 'Apply'}
        </button>
        {job.description && (
          <button onClick={() => setOpen((o) => !o)} className="text-sm font-medium text-slate-500 hover:text-slate-800">
            {open ? 'Hide details' : 'Show details'}
          </button>
        )}
      </div>
    </Card>
  )
}

function StudentOpportunities() {
  const { data, loading, error, reload } = useAsync(loadAll)
  const [search, setSearch] = useState('')
  const [onlyEligible, setOnlyEligible] = useState(false)
  const [matches, setMatches] = useState(null)
  const [matchBusy, setMatchBusy] = useState(false)
  const [matchError, setMatchError] = useState('')

  const loadMatches = async () => {
    try {
      setMatchBusy(true)
      setMatchError('')
      const r = await studentApi('recommendations')
      setMatches(Object.fromEntries((r.data.recommendations || []).map((x) => [x.id, x.match_percentage])))
    } catch (e) {
      setMatchError(e.message)
    } finally {
      setMatchBusy(false)
    }
  }

  let jobs = data?.jobs || []
  const q = search.trim().toLowerCase()
  if (q) {
    jobs = jobs.filter((j) =>
      [j.role, j.companies?.name, j.location, ...(j.required_skills || [])]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    )
  }
  if (onlyEligible) jobs = jobs.filter((j) => data.eligibility[j.id]?.eligible)
  if (matches) jobs = [...jobs].sort((a, b) => (matches[b.id] ?? -1) - (matches[a.id] ?? -1))

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Opportunities"
        subtitle="Open jobs with your eligibility. You can only apply to jobs you qualify for."
        action={
          <button
            onClick={loadMatches}
            disabled={matchBusy}
            className="rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
          >
            {matchBusy ? 'Matching…' : matches ? 'Refresh matches' : '✨ Match jobs to my resume'}
          </button>
        }
      />
      <ErrorBox message={error} onRetry={reload} />
      <ErrorBox message={matchError} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search role, company, skill…"
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
          Only jobs I'm eligible for
        </label>
      </div>

      {loading ? (
        <Loading text="Loading jobs and checking your eligibility…" />
      ) : jobs.length === 0 ? (
        <Empty icon="💼" title="No jobs to show" text="New openings will appear here when placement officers post them." />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              eligibility={data.eligibility[job.id]}
              applied={data.applied.has(job.id)}
              match={matches ? matches[job.id] : null}
              onApplied={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default StudentOpportunities
