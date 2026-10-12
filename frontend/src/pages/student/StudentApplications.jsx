import { studentApi } from '../../lib/studentApi'
import StatusBadge from '../../components/StatusBadge'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { formatDate, useAsync } from '../../components/student/helpers'

function StudentApplications() {
  const { data, loading, error, reload } = useAsync(() => studentApi('applications').then((r) => r.data || []))

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Applications" subtitle="Track the status of jobs you've applied to." />
      <ErrorBox message={error} onRetry={reload} />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <Card>
          <Empty icon="📄" title="No applications yet" text="Your submitted applications will show up here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{a.jobs?.role || 'Job'}</h3>
                  <p className="text-sm text-slate-500">
                    {a.jobs?.companies?.name || '—'}
                    {a.jobs?.location ? ` · ${a.jobs.location}` : ''} · Applied {formatDate(a.applied_at || a.created_at)}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              {(a.jobs?.required_skills || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.jobs.required_skills.map((s) => <Chip key={s} tone="blue">{s}</Chip>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default StudentApplications
