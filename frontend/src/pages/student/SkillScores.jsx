import { studentApi } from '../../lib/studentApi'
import { Card, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { useAsync } from '../../components/student/helpers'

function SkillScores() {
  const { data, loading, error, reload } = useAsync(() => studentApi('skill-scores').then((r) => r.data || []))
  const scored = (data || []).filter((s) => s.score != null)
  const overall = scored.length ? scored.reduce((t, s) => t + Number(s.score), 0) / scored.length : null

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Skill Scores" subtitle="Your official score for each skill is your highest assessment result." />
      <ErrorBox message={error} onRetry={reload} />
      {loading ? (
        <Loading />
      ) : scored.length === 0 ? (
        <Card><Empty icon="📊" title="No skill scores yet" text="Complete an assessment and your scores will appear here." /></Card>
      ) : (
        <Card className="max-w-3xl">
          <div className="mb-6">
            <p className="text-sm text-slate-500">Overall skill score</p>
            <p className="mt-1 text-4xl font-bold text-blue-600">{overall.toFixed(1)}%</p>
          </div>
          <div className="space-y-5">
            {scored
              .sort((a, b) => Number(b.score) - Number(a.score))
              .map((s) => (
                <div key={s.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.skills?.name || 'Skill'}</span>
                    <span className="font-semibold text-slate-800">{Number(s.score).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-blue-500" style={{ width: `${Math.min(100, Number(s.score))}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default SkillScores
