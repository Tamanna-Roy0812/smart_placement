import { useNavigate } from 'react-router-dom'
import { studentApi } from '../../lib/studentApi'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { useAsync } from '../../components/student/helpers'

async function load() {
  const [assessments, skills, attempts] = await Promise.all([
    studentApi('assessments'),
    studentApi('skills').catch(() => ({ data: [] })),
    studentApi('attempts'),
  ])
  const skillName = Object.fromEntries((skills.data || []).map((s) => [s.id, s.name]))
  const best = {}
  const count = {}
  for (const a of attempts.data || []) {
    count[a.assessment_id] = (count[a.assessment_id] || 0) + 1
    if (a.completed_at && (best[a.assessment_id] ?? -1) < Number(a.percentage)) {
      best[a.assessment_id] = Number(a.percentage)
    }
  }
  return { list: assessments.data || [], skillName, best, count }
}

function Assessments() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(load)

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Assessments"
        subtitle="Take skill tests. Your highest score for each skill is what recruiters and job eligibility use."
      />
      <ErrorBox message={error} onRetry={reload} />
      {loading ? (
        <Loading />
      ) : !data || data.list.length === 0 ? (
        <Card><Empty icon="📝" title="No assessments available" text="Assessments created by the admin will appear here." /></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.list.map((a) => {
            const best = data.best[a.id]
            const passed = best != null && best >= Number(a.passing_percentage || 0)
            return (
              <Card key={a.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{a.title}</h3>
                  {best != null && <Chip tone={passed ? 'green' : 'amber'}>{passed ? 'Passed' : 'Not passed'}</Chip>}
                </div>
                {data.skillName[a.skill_id] && <p className="mt-1 text-sm text-blue-600">{data.skillName[a.skill_id]}</p>}
                {a.description && <p className="mt-2 text-sm text-slate-500">{a.description}</p>}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-base font-bold text-slate-800">{a.duration_minutes ?? '—'}</p>minutes</div>
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-base font-bold text-slate-800">{a.number_of_questions ?? '—'}</p>questions</div>
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-base font-bold text-slate-800">{a.passing_percentage ?? '—'}%</p>to pass</div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {best != null ? `Best score: ${best.toFixed(1)}%` : 'Not attempted yet'}
                  {data.count[a.id] ? ` · ${data.count[a.id]} attempt(s)` : ''}
                </p>
                <button
                  onClick={() => navigate(`/student/assessments/${a.id}`)}
                  className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {data.count[a.id] ? 'Take again' : 'Start'}
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Assessments
