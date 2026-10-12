import { studentApi } from '../../lib/studentApi'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { useAsync } from '../../components/student/helpers'

function bestPerAssessment(attempts) {
  const map = new Map()
  for (const a of attempts) {
    if (!a.completed_at) continue
    const current = map.get(a.assessment_id)
    if (!current || Number(a.percentage) > Number(current.percentage)) map.set(a.assessment_id, a)
  }
  return [...map.values()].sort((x, y) => Number(y.percentage) - Number(x.percentage))
}

function Results() {
  const { data, loading, error, reload } = useAsync(() => studentApi('attempts').then((r) => r.data || []))
  const results = data ? bestPerAssessment(data) : []
  const passed = results.filter((r) => Number(r.percentage) >= Number(r.assessments?.passing_percentage || 0)).length

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Results" subtitle="Your highest score for each assessment." />
      <ErrorBox message={error} onRetry={reload} />
      {loading ? (
        <Loading />
      ) : results.length === 0 ? (
        <Card><Empty icon="🏆" title="No results yet" text="Submit an assessment to see your results." /></Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="!p-5"><p className="text-sm text-slate-500">Assessments taken</p><p className="mt-1 text-3xl font-bold text-slate-900">{results.length}</p></Card>
            <Card className="!p-5"><p className="text-sm text-slate-500">Passed</p><p className="mt-1 text-3xl font-bold text-emerald-600">{passed}</p></Card>
            <Card className="!p-5"><p className="text-sm text-slate-500">Average</p><p className="mt-1 text-3xl font-bold text-blue-600">{(results.reduce((t, r) => t + Number(r.percentage), 0) / results.length).toFixed(1)}%</p></Card>
          </div>
          <div className="space-y-4">
            {results.map((r) => {
              const pct = Number(r.percentage)
              const pass = pct >= Number(r.assessments?.passing_percentage || 0)
              return (
                <Card key={r.assessment_id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{r.assessments?.title || 'Assessment'}</h3>
                      <p className="text-xs text-slate-500">Pass mark {r.assessments?.passing_percentage ?? '—'}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{pct.toFixed(1)}%</p>
                      <Chip tone={pass ? 'green' : 'red'}>{pass ? 'Passed' : 'Not passed'}</Chip>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${pass ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default Results
