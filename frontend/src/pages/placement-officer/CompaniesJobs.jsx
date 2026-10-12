import { useCallback, useEffect, useState } from 'react'
import { FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import { officerApi } from '../../lib/officerApi'

const EMPTY_COMPANY = {
  name: '',
  industry: '',
  website: '',
  location: '',
  description: '',
}

const EMPTY_JOB = {
  company_id: '',
  role: '',
  description: '',
  salary: '',
  location: '',
  employment_type: 'Full-time',
  deadline: '',
  required_skills: '',
  required_skill_percentage: '',
  minimum_aptitude_percentage: '',
  minimum_cgpa: '',
  eligible_branches: '',
}

const csv = (text) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const labelClass = 'mb-2 block text-sm font-medium text-slate-700'
const thClass =
  'px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'

function ModalShell({ title, subtitle, onClose, onSave, saving, saveLabel, error, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          wide ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {error && (
            <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-5 p-6 md:grid-cols-2">{children}</div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, full, hint, children }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function EmptyRow({ cols, icon, title, text }) {
  return (
    <tr>
      <td colSpan={cols} className="px-6 py-16 text-center">
        <div className="mx-auto max-w-md">
          <div className="mb-4 text-4xl">{icon}</div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{text}</p>
        </div>
      </td>
    </tr>
  )
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-3 text-sm">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 font-medium text-blue-600 transition hover:text-blue-800"
      >
        <FiEdit2 size={15} />
        Edit
      </button>
      <span className="text-slate-300">/</span>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1.5 font-medium text-red-500 transition hover:text-red-700"
      >
        <FiTrash2 size={15} />
        Delete
      </button>
    </div>
  )
}

function CompaniesJobs() {
  const [activeTab, setActiveTab] = useState('companies')
  const [companies, setCompanies] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')

  const [companyModal, setCompanyModal] = useState(null) // { editing }
  const [jobModal, setJobModal] = useState(null)
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY)
  const [jobForm, setJobForm] = useState(EMPTY_JOB)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null) // { type, item }

  const load = useCallback(async () => {
    try {
      const [c, j] = await Promise.all([officerApi('companies'), officerApi('jobs')])
      setCompanies(c.data)
      setJobs(j.data)
      setPageError('')
    } catch (e) {
      setPageError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(load, 0)
    return () => clearTimeout(timer)
  }, [load])

  /* ---------- companies ---------- */
  const openCompany = (company = null) => {
    setFormError('')
    setCompanyForm(
      company
        ? {
            name: company.name || '',
            industry: company.industry || '',
            website: company.website || '',
            location: company.location || '',
            description: company.description || '',
          }
        : EMPTY_COMPANY
    )
    setCompanyModal({ editing: company })
  }

  const saveCompany = async () => {
    try {
      setSaving(true)
      setFormError('')
      const editing = companyModal.editing
      await officerApi(editing ? `companies/${editing.id}` : 'companies', {
        method: editing ? 'PUT' : 'POST',
        body: companyForm,
      })
      setCompanyModal(null)
      await load()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  /* ---------- jobs ---------- */
  const openJob = (job = null) => {
    setFormError('')
    setJobForm(
      job
        ? {
            company_id: job.company_id || '',
            role: job.role || '',
            description: job.description || '',
            salary: job.salary ?? '',
            location: job.location || '',
            employment_type: job.employment_type || 'Full-time',
            deadline: job.deadline || '',
            required_skills: (job.required_skills || []).join(', '),
            required_skill_percentage: job.required_skill_percentage ?? '',
            minimum_aptitude_percentage: job.minimum_aptitude_percentage ?? '',
            minimum_cgpa: job.minimum_cgpa ?? '',
            eligible_branches: (job.eligible_branches || []).join(', '),
          }
        : EMPTY_JOB
    )
    setJobModal({ editing: job })
  }

  const saveJob = async () => {
    try {
      setSaving(true)
      setFormError('')
      const f = jobForm
      const body = {
        company_id: f.company_id,
        role: f.role,
        description: f.description,
        location: f.location,
        employment_type: f.employment_type,
        deadline: f.deadline,
        required_skills: csv(f.required_skills),
        eligible_branches: csv(f.eligible_branches),
        salary: f.salary,
        required_skill_percentage: f.required_skill_percentage,
        minimum_aptitude_percentage: f.minimum_aptitude_percentage,
        minimum_cgpa: f.minimum_cgpa,
      }
      const editing = jobModal.editing
      await officerApi(editing ? `jobs/${editing.id}` : 'jobs', {
        method: editing ? 'PUT' : 'POST',
        body,
      })
      setJobModal(null)
      await load()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  /* ---------- delete ---------- */
  const confirmDelete = async () => {
    try {
      setSaving(true)
      const { type, item } = deleteTarget
      await officerApi(`${type === 'company' ? 'companies' : 'jobs'}/${item.id}`, {
        method: 'DELETE',
      })
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setDeleteTarget(null)
      setPageError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const setC = (k) => (e) => setCompanyForm({ ...companyForm, [k]: e.target.value })
  const setJ = (k) => (e) => setJobForm({ ...jobForm, [k]: e.target.value })

  const q = (s) => s.trim().toLowerCase()
  const shownCompanies = companies.filter((c) =>
    `${c.name} ${c.industry || ''} ${c.location || ''}`.toLowerCase().includes(q(companySearch))
  )
  const shownJobs = jobs.filter((j) =>
    `${j.role} ${j.company?.name || ''} ${j.location || ''}`.toLowerCase().includes(q(jobSearch))
  )

  const tabs = [
    { id: 'companies', label: 'Companies', icon: '🏢' },
    { id: 'jobs', label: 'Jobs', icon: '💼' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">Placement Portal</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Companies & Jobs 🏢
        </h1>
        <p className="mt-2 text-slate-500">Manage companies and job opportunities.</p>
      </div>

      {pageError && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{pageError}</span>
          <button type="button" onClick={() => setPageError('')} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex gap-2 border-b border-slate-200 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ================= COMPANIES ================= */}
        {activeTab === 'companies' && (
          <>
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Companies</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage companies participating in campus placements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCompany()}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                + Add Company
              </button>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies..."
                className={inputClass}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thClass}>Company</th>
                    <th className={thClass}>Industry</th>
                    <th className={thClass}>Location</th>
                    <th className={thClass}>Website</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shownCompanies.length === 0 ? (
                    <EmptyRow
                      cols={5}
                      icon="🏢"
                      title={loading ? 'Loading…' : 'No companies yet'}
                      text={loading ? '' : 'Click “Add Company” to create the first one.'}
                    />
                  ) : (
                    shownCompanies.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {c.name}
                          {c.is_verified === false && (
                            <span className="ml-2 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                              Pending admin approval
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{c.industry || '—'}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{c.location || '—'}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {c.website ? (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {c.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {c.can_edit ? (
                            <RowActions
                              onEdit={() => openCompany(c)}
                              onDelete={() => setDeleteTarget({ type: 'company', item: c })}
                            />
                          ) : (
                            <p className="text-right text-xs text-slate-400">Added by admin</p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ================= JOBS ================= */}
        {activeTab === 'jobs' && (
          <>
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Jobs</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create and manage job opportunities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openJob()}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                + Create Job
              </button>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search jobs..."
                className={inputClass}
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thClass}>Company</th>
                    <th className={thClass}>Role</th>
                    <th className={thClass}>Location</th>
                    <th className={thClass}>Deadline</th>
                    <th className={thClass}>Applicants</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shownJobs.length === 0 ? (
                    <EmptyRow
                      cols={6}
                      icon="💼"
                      title={loading ? 'Loading…' : 'No jobs yet'}
                      text={loading ? '' : 'Click “Create Job” to post the first one.'}
                    />
                  ) : (
                    shownJobs.map((j) => (
                      <tr key={j.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                          {j.company?.name || '—'}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{j.role}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{j.location || '—'}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {j.deadline ? new Date(j.deadline).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{j.application_count}</td>
                        <td className="px-5 py-4">
                          <RowActions
                            onEdit={() => openJob(j)}
                            onDelete={() => setDeleteTarget({ type: 'job', item: j })}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ================= COMPANY MODAL ================= */}
      {companyModal && (
        <ModalShell
          title={companyModal.editing ? 'Edit Company' : 'Add Company'}
          subtitle={
            companyModal.editing
              ? 'Update company information.'
              : 'Add a company to the placement portal.'
          }
          onClose={() => setCompanyModal(null)}
          onSave={saveCompany}
          saving={saving}
          saveLabel={companyModal.editing ? 'Save Changes' : 'Save Company'}
          error={formError}
        >
          <Field label="Company Name">
            <input type="text" value={companyForm.name} onChange={setC('name')} placeholder="Enter company name" className={inputClass} />
          </Field>
          <Field label="Industry">
            <input type="text" value={companyForm.industry} onChange={setC('industry')} placeholder="e.g. Software" className={inputClass} />
          </Field>
          <Field label="Location">
            <input type="text" value={companyForm.location} onChange={setC('location')} placeholder="e.g. Pune" className={inputClass} />
          </Field>
          <Field label="Website">
            <input type="url" value={companyForm.website} onChange={setC('website')} placeholder="https://example.com" className={inputClass} />
          </Field>
          <Field label="Description" full>
            <textarea rows="3" value={companyForm.description} onChange={setC('description')} placeholder="About the company..." className={inputClass} />
          </Field>
        </ModalShell>
      )}

      {/* ================= JOB MODAL ================= */}
      {jobModal && (
        <ModalShell
          wide
          title={jobModal.editing ? 'Edit Job' : 'Create Job'}
          subtitle={
            jobModal.editing
              ? 'Update the job opportunity details.'
              : 'Add a new job opportunity.'
          }
          onClose={() => setJobModal(null)}
          onSave={saveJob}
          saving={saving}
          saveLabel={jobModal.editing ? 'Save Changes' : 'Create Job'}
          error={formError}
        >
          <Field label="Company">
            <select value={jobForm.company_id} onChange={setJ('company_id')} className={inputClass}>
              <option value="">{companies.length ? 'Select company' : 'Add a company first'}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <input type="text" value={jobForm.role} onChange={setJ('role')} placeholder="e.g. Software Engineer" className={inputClass} />
          </Field>
          <Field label="Job Description" full>
            <textarea rows="4" value={jobForm.description} onChange={setJ('description')} placeholder="Enter job description..." className={inputClass} />
          </Field>
          <Field label="Salary (per year, ₹)">
            <input type="number" min="0" value={jobForm.salary} onChange={setJ('salary')} placeholder="e.g. 800000" className={inputClass} />
          </Field>
          <Field label="Location">
            <input type="text" value={jobForm.location} onChange={setJ('location')} placeholder="e.g. Pune" className={inputClass} />
          </Field>
          <Field label="Employment Type">
            <select value={jobForm.employment_type} onChange={setJ('employment_type')} className={inputClass}>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
          </Field>
          <Field label="Application Deadline">
            <input type="date" value={jobForm.deadline} onChange={setJ('deadline')} className={inputClass} />
          </Field>
          <Field label="Required Skills" full hint="Separate multiple skills with commas. Use the same names as in Skills (e.g. Java, SQL, React).">
            <input type="text" value={jobForm.required_skills} onChange={setJ('required_skills')} placeholder="e.g. Java, SQL, React" className={inputClass} />
          </Field>
          <Field label="Required Skill Percentage">
            <input type="number" min="0" max="100" value={jobForm.required_skill_percentage} onChange={setJ('required_skill_percentage')} placeholder="e.g. 70" className={inputClass} />
          </Field>
          <Field label="Minimum Aptitude Percentage">
            <input type="number" min="0" max="100" value={jobForm.minimum_aptitude_percentage} onChange={setJ('minimum_aptitude_percentage')} placeholder="e.g. 65" className={inputClass} />
          </Field>
          <Field label="Minimum CGPA">
            <input type="number" min="0" max="10" step="0.01" value={jobForm.minimum_cgpa} onChange={setJ('minimum_cgpa')} placeholder="e.g. 7.5" className={inputClass} />
          </Field>
          <Field label="Eligible Branches" hint="Separate with commas. Leave empty for all branches.">
            <input type="text" value={jobForm.eligible_branches} onChange={setJ('eligible_branches')} placeholder="e.g. CSE, IT, AI&DS" className={inputClass} />
          </Field>
        </ModalShell>
      )}

      {/* ================= DELETE CONFIRMATION ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <FiTrash2 size={22} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Delete {deleteTarget.type === 'company' ? 'Company' : 'Job'}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{' '}
              <strong>
                {deleteTarget.type === 'company'
                  ? deleteTarget.item.name
                  : deleteTarget.item.role}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={saving}
                className="rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompaniesJobs
