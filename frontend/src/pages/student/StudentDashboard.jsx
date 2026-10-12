import { Link } from 'react-router-dom'
import { studentApi } from '../../lib/studentApi'
import StatusBadge from '../../components/StatusBadge'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { formatDate, useAsync } from '../../components/student/helpers'

async function loadDashboard() {
  const [profile, apps, notes, skills, resume, jobs] = await Promise.all([
    studentApi('profile').catch(() => ({ data: null })),
    studentApi('applications'),
    studentApi('notifications'),
    studentApi('skill-scores'),
    studentApi('resume').catch(() => ({ data: null })),
    studentApi('jobs'),
  ])
  return {
    profile: profile.data,
    applications: apps.data || [],
    notifications: notes.data || [],
    skills: skills.data || [],
    resume: resume.data,
    jobs: jobs.data || [],
  }
}

function Stat({ label, value, tone }) {
  return (
    <Card className="!p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    </Card>
  )
}

function StudentDashboard() {
  const { data, loading, error, reload } = useAsync(loadDashboard)

  if (loading) return <div className="p-6 md:p-8"><Loading /></div>

  const d = data
  const apps = d?.applications || []
  const unread = (d?.notifications || []).filter((n) => !n.is_read)
  const count = (s) => apps.filter((a) => a.status === s).length
  const firstName = (d?.profile?.name || '').split(' ')[0]

  const checklist = [
    ['Add your CGPA and branch', Boolean(d?.profile?.cgpa && d?.profile?.branch), '/student/profile'],
    ['Upload your resume', Boolean(d?.resume), '/student/resume'],
    ['Complete an assessment', (d?.skills || []).length > 0, '/student/assessments'],
    ['Apply to a job', apps.length > 0, '/student/opportunities'],
  ]

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title={`Welcome back${firstName ? `, ${firstName}` : ''} 👋`}
        subtitle="Here's what's happening with your placement journey."
      />
      <ErrorBox message={error} onRetry={reload} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Applications" value={apps.length} tone="text-blue-600" />
        <Stat label="Shortlisted" value={count('Shortlisted')} tone="text-purple-600" />
        <Stat label="Selected" value={count('Selected')} tone="text-emerald-600" />
        <Stat label="Open jobs" value={(d?.jobs || []).length} tone="text-slate-800" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent applications</h2>
            <Link to="/student/applications" className="text-sm font-medium text-blue-600">View all</Link>
          </div>
          {apps.length === 0 ? (
            <Empty icon="📄" title="No applications yet" text="Find a job in Opportunities and apply." />
          ) : (
            <div className="divide-y divide-slate-100">
              {apps.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{a.jobs?.role || 'Job'}</p>
                    <p className="text-xs text-slate-500">
                      {a.jobs?.companies?.name || '—'} · {formatDate(a.applied_at || a.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-900">Get started</h2>
            <ul className="space-y-2.5">
              {checklist.map(([label, done, to]) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span className={done ? 'text-emerald-600' : 'text-slate-300'}>{done ? '✔' : '○'}</span>
                  {done ? (
                    <span className="text-slate-400 line-through">{label}</span>
                  ) : (
                    <Link to={to} className="font-medium text-slate-700 hover:text-blue-600">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Notifications</h2>
              {unread.length > 0 && <Chip tone="red">{unread.length} new</Chip>}
            </div>
            {unread.length === 0 ? (
              <p className="text-sm text-slate-500">You're all caught up.</p>
            ) : (
              <ul className="space-y-2">
                {unread.slice(0, 3).map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/student/notifications" className="mt-3 inline-block text-sm font-medium text-blue-600">
              Open notifications
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
