import { studentApi } from '../../lib/studentApi'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { formatDate, useAsync } from '../../components/student/helpers'

function AssessmentsAttempts() {
  const { data, loading, error, reload } = useAsync(() => studentApi('attempts').then((r) => r.data || []))

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Assessment Attempts" subtitle="Every attempt you have made, newest first." />
      <ErrorBox message={error} onRetry={reload} />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <Card><Empty icon="🧪" title="No attempts yet" text="Start an assessment to see your attempts here." /></Card>
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-4">Assessment</th>
                <th className="px-5 py-4">Started</th>
                <th className="px-5 py-4">Score</th>
                <th className="px-5 py-4">Percentage</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => {
                const done = Boolean(a.completed_at)
                const pass = done && Number(a.percentage) >= Number(a.assessments?.passing_percentage || 0)
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-medium text-slate-800">{a.assessments?.title || 'Assessment'}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(a.started_at || a.created_at)}</td>
                    <td className="px-5 py-4 text-slate-600">{done ? a.score : '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{done ? `${Number(a.percentage).toFixed(1)}%` : '—'}</td>
                    <td className="px-5 py-4">
                      {!done ? <Chip tone="amber">Not submitted</Chip> : pass ? <Chip tone="green">Passed</Chip> : <Chip tone="red">Not passed</Chip>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

export default AssessmentsAttempts
