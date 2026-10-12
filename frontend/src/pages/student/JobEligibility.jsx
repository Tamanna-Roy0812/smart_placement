import { studentApi } from '../../lib/studentApi'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { useAsync } from '../../components/student/helpers'

async function load() {
  const jobs = (await studentApi('jobs')).data || []
  return Promise.all(
    jobs.map((j) =>
      studentApi(`jobs/${j.id}/eligibility`)
        .then((r) => ({ job: j, result: r.data }))
        .catch(() => ({ job: j, result: null }))
    )
  )
}

function JobEligibility() {
  const { data, loading, error, reload } = useAsync(load)

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Job Eligibility" subtitle="See why you are, or aren't, eligible for each open job." />
      <ErrorBox message={error} onRetry={reload} />
      {loading ? (
        <Loading text="Checking your eligibility…" />
      ) : !data || data.length === 0 ? (
        <Card><Empty icon="✅" title="No jobs yet" text="Eligibility appears here when jobs are posted." /></Card>
      ) : (
        <div className="space-y-4">
          {data.map(({ job, result }) => (
            <Card key={job.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{job.role}</h2>
                  <p className="text-sm text-slate-500">{job.companies?.name || '—'}</p>
                </div>
                {result && <Chip tone={result.eligible ? 'green' : 'red'}>{result.eligible ? 'Eligible' : 'Not eligible'}</Chip>}
              </div>
              {result && !result.eligible && (
                <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-red-600">
                  {result.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default JobEligibility
