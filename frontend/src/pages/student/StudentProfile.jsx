import { useState } from 'react'
import { studentApi } from '../../lib/studentApi'
import { Card, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { useAsync } from '../../components/student/helpers'
import { supabase } from '../../lib/supabase'

const FIELDS = [
  ['name', 'Full name', 'text'],
  ['phone', 'Phone', 'tel'],
  ['department', 'Department', 'text'],
  ['branch', 'Branch', 'text'],
  ['graduation_year', 'Graduation year', 'number'],
  ['cgpa', 'CGPA (out of 10)', 'number'],
]

async function load() {
  const [profile, session] = await Promise.all([
    studentApi('profile'),
    supabase.auth.getSession(),
  ])
  return { profile: profile.data, email: session.data?.session?.user?.email || '' }
}

function ProfileForm({ initial, email, onSaved }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(FIELDS.map(([k]) => [k, initial?.[k] ?? '']))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    const cgpa = form.cgpa === '' ? null : Number(form.cgpa)
    if (cgpa !== null && (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10)) {
      setError('CGPA must be between 0 and 10.')
      return
    }
    const body = {
      name: form.name.trim(),
      phone: form.phone || null,
      department: form.department || null,
      branch: form.branch || null,
      graduation_year: form.graduation_year === '' ? null : Number(form.graduation_year),
      cgpa,
    }
    if (!body.name) {
      setError('Name is required.')
      return
    }
    try {
      setSaving(true)
      const result = await studentApi('profile', { method: 'PATCH', body })
      setSaved(true)
      onSaved?.(result.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
        <input value={email} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500" />
      </div>
      {FIELDS.map(([key, label, type]) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
          <input
            type={type}
            step={key === 'cgpa' ? '0.01' : undefined}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-blue-500"
          />
        </div>
      ))}
      <div className="md:col-span-2">
        <ErrorBox message={error} />
        {saved && <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Profile saved.</p>}
        <button
          disabled={saving}
          className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function StudentProfile() {
  const { data, loading, error, reload } = useAsync(load)

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="My Profile" subtitle="Keep your details up to date. Eligibility for jobs uses your CGPA and branch." />
      {loading ? (
        <Loading />
      ) : (
        <>
          <ErrorBox message={error} onRetry={reload} />
          {data && (
            <Card className="max-w-3xl">
              <ProfileForm initial={data.profile} email={data.email} />
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default StudentProfile
