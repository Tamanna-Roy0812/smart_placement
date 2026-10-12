import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

const emptyStats = {
  students: 0,
  placement_officers: 0,
  companies: 0,
  skills: 0,
  assessments: 0,
}

function AdminDashboard() {
  const [stats, setStats] = useState(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await adminApi('dashboard')
      setStats({
        students: Number(data?.students) || 0,
        placement_officers: Number(data?.placement_officers) || 0,
        companies: Number(data?.companies) || 0,
        skills: Number(data?.skills) || 0,
        assessments: Number(data?.assessments) || 0,
      })
    } catch (err) {
      setError(err.message || 'Unable to load dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(loadDashboard, 0)
    return () => clearTimeout(t)
  }, [])

  const cards = [
    {
      label: 'Total Students',
      value: stats.students,
      description: 'Registered students',
      icon: '🎓',
      cardClass:
        'border-green-100 bg-gradient-to-br from-green-50 to-white',
      iconClass: 'bg-green-100',
    },
    {
      label: 'Placement Officers',
      value: stats.placement_officers,
      description: 'Registered placement officers',
      icon: '👤',
      cardClass:
        'border-indigo-100 bg-gradient-to-br from-indigo-50 to-white',
      iconClass: 'bg-indigo-100',
    },
    {
      label: 'Total Companies',
      value: stats.companies,
      description: 'Companies in placement portal',
      icon: '🏢',
      cardClass:
        'border-blue-100 bg-gradient-to-br from-blue-50 to-white',
      iconClass: 'bg-blue-100',
    },
    {
      label: 'Total Skills',
      value: stats.skills,
      description: 'Skills available for assessments',
      icon: '🧠',
      cardClass:
        'border-purple-100 bg-gradient-to-br from-purple-50 to-white',
      iconClass: 'bg-purple-100',
    },
    {
      label: 'Total Assessments',
      value: stats.assessments,
      description: 'Assessments created',
      icon: '📝',
      cardClass:
        'border-amber-100 bg-gradient-to-br from-amber-50 to-white',
      iconClass: 'bg-amber-100',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">

      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">
          Admin Panel
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Welcome back! 👋
        </h1>

        <p className="mt-2 text-slate-500">
          Here's what's happening with your placement portal today.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${card.cardClass}`}
          >
            <div
              className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${card.iconClass}`}
            >
              {card.icon}
            </div>

            <p className="text-sm font-medium text-slate-500">
              {card.label}
            </p>

            <h2 className="mt-2 text-4xl font-bold text-slate-900">
              {loading ? '—' : card.value}
            </h2>

            <p className="mt-3 text-xs text-slate-500">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* Dashboard Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Placement Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Placement Portal Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current administrative data
            </p>
          </div>

          <div className="space-y-4">

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">
                Students
              </span>

              <span className="font-semibold text-slate-900">
                {loading ? '—' : stats.students}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">
                Placement Officers
              </span>

              <span className="font-semibold text-slate-900">
                {loading ? '—' : stats.placement_officers}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">
                Companies
              </span>

              <span className="font-semibold text-slate-900">
                {loading ? '—' : stats.companies}
              </span>
            </div>

          </div>
        </div>

        {/* Assessment Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Assessment Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Skills and assessments currently available
            </p>
          </div>

          <div className="space-y-4">

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">
                Skills
              </span>

              <span className="font-semibold text-slate-900">
                {loading ? '—' : stats.skills}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">
                Assessments
              </span>

              <span className="font-semibold text-slate-900">
                {loading ? '—' : stats.assessments}
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  )
}

export default AdminDashboard