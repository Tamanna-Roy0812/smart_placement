import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiTrash2, FiX, FiSearch } from 'react-icons/fi'
import { adminApi } from '../../lib/adminApi'

const emptyForm = { name: '', description: '', industry: '', website: '', location: '', logo_url: '' }
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const labelClass = 'mb-2 block text-sm font-medium text-slate-700'

function Companies() {
  const [activeTab, setActiveTab] = useState('companies')
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadCompanies = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi('companies')
      setCompanies(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Unable to load companies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(loadCompanies, 0)
    return () => clearTimeout(t)
  }, [])

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return companies
    return companies.filter((company) => [company.name, company.industry, company.location, company.website]
      .some((value) => String(value || '').toLowerCase().includes(term)))
  }, [companies, search])

  const openAdd = () => { setEditingCompany(null); setForm(emptyForm); setError(''); setShowForm(true) }
  const openEdit = (company) => {
    setEditingCompany(company)
    setForm({ name: company.name || '', description: company.description || '', industry: company.industry || '', website: company.website || '', location: company.location || '', logo_url: company.logo_url || '' })
    setError('')
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingCompany(null); setForm(emptyForm) }

  const saveCompany = async () => {
    if (!form.name.trim()) { setError('Company name is required.'); return }
    setSaving(true); setError(''); setNotice('')
    try {
      await adminApi('companies', { method: editingCompany ? 'PUT' : 'POST', id: editingCompany?.id, body: {
        name: form.name.trim(), description: form.description.trim() || null,
        industry: form.industry.trim() || null, website: form.website.trim() || null,
        location: form.location.trim() || null, logo_url: form.logo_url.trim() || null,
      } })
      await loadCompanies()
      closeForm()
      setNotice(editingCompany ? 'Company updated successfully.' : 'Company added successfully.')
    } catch (err) { setError(err.message || 'Unable to save company.') }
    finally { setSaving(false) }
  }

  const toggleVerified = async (company) => {
    setError(''); setNotice('')
    try {
      await adminApi('companies', { method: 'PUT', id: company.id, body: { is_verified: company.is_verified === false } })
      await loadCompanies()
      setNotice(company.is_verified === false ? `${company.name} approved. Students can now see its jobs.` : `${company.name} is no longer verified. Its jobs are hidden from students.`)
    } catch (err) { setError(err.message || 'Unable to update company.') }
  }

  const deleteCompany = async (company) => {
    if (!window.confirm(`Delete ${company.name}? This cannot be undone.`)) return
    setError(''); setNotice('')
    try { await adminApi('companies', { method: 'DELETE', id: company.id }); await loadCompanies(); setNotice('Company deleted.') }
    catch (err) { setError(err.message || 'Unable to delete company.') }
  }

  const tabs = [{ id: 'companies', label: 'Companies', icon: '🏢' }, { id: 'reports', label: 'Reports', icon: '📊' }]

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">Admin Panel</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Companies 🏢</h1>
        <p className="mt-2 text-slate-500">Manage companies and view placement reports.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-7 border-b border-slate-200"><div className="flex flex-wrap gap-7">
          {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><span>{tab.icon}</span>{tab.label}</button>)}
        </div></div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        {activeTab === 'companies' && <>
          <div className="mb-6"><h2 className="text-xl font-bold text-slate-900">Company Management</h2><p className="mt-1 text-sm text-slate-500">Manage companies participating in the placement process.</p></div>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md"><FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder="Search companies..." className={`${inputClass} pl-11`} /></div>
            <button type="button" onClick={openAdd} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">+ Add Company</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-4">Company</th><th className="px-5 py-4">Industry</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Website</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead>
              <tbody>{loading ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Loading companies…</td></tr> : filteredCompanies.length === 0 ? <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-500">{search ? 'No companies match your search.' : 'No companies available yet. Add your first company.'}</td></tr> : filteredCompanies.map((company) => <tr key={company.id} className="border-t border-slate-100"><td className="px-5 py-4"><div className="font-semibold text-slate-800">{company.name}</div>{company.description && <div className="mt-1 max-w-sm text-xs text-slate-500">{company.description}</div>}</td><td className="px-5 py-4 text-slate-600">{company.industry || '—'}</td><td className="px-5 py-4 text-slate-600">{company.location || '—'}</td><td className="px-5 py-4">{company.website ? <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Visit website</a> : <span className="text-slate-400">—</span>}</td><td className="px-5 py-4">{company.is_verified === false ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Pending approval</span> : <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Verified</span>}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><button type="button" onClick={() => toggleVerified(company)} className={`inline-flex items-center gap-1.5 font-medium ${company.is_verified === false ? 'text-emerald-600 hover:text-emerald-800' : 'text-amber-600 hover:text-amber-800'}`}>{company.is_verified === false ? 'Approve' : 'Revoke'}</button><button type="button" onClick={() => openEdit(company)} className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-800"><FiEdit2 size={15} />Edit</button><button type="button" onClick={() => deleteCompany(company)} className="inline-flex items-center gap-1.5 font-medium text-red-500 hover:text-red-700"><FiTrash2 size={15} />Delete</button></div></td></tr>)}</tbody>
            </table>
          </div>
        </>}

        {activeTab === 'reports' && <>
          <h2 className="text-xl font-bold text-slate-900">Placement Reports 📊</h2><p className="mt-1 text-sm text-slate-500">Report views can be connected when assessment-result data is available.</p>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">{[{title:'Student Assessment Results',desc:'View student assessment performance when result data is available.',icon:'📝'},{title:'Skill Performance',desc:'Review student skill performance when score data is available.',icon:'🧠'},{title:'Aptitude Results',desc:'Review aptitude outcomes when result data is available.',icon:'🎯'},{title:'Job Applications',desc:'Review application information from the placement system.',icon:'📄'}].map((item) => <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><div className="mb-4 text-2xl">{item.icon}</div><h3 className="font-bold text-slate-900">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p></div>)}</div>
        </>}
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5"><div><h2 className="text-xl font-bold text-slate-900">{editingCompany ? 'Edit Company' : 'Add Company'}</h2><p className="mt-1 text-sm text-slate-500">Enter details stored in the placement database.</p></div><button type="button" onClick={closeForm} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><FiX size={20} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto"><div className="grid gap-5 p-6">
          {[['name','Company Name','e.g. Example Technologies'],['industry','Industry','e.g. Software'],['location','Location','e.g. Pune, India'],['website','Website','https://company.com'],['logo_url','Logo URL','https://company.com/logo.png']].map(([key,label,placeholder]) => <div key={key}><label className={labelClass} htmlFor={`company-${key}`}>{label}{key === 'name' ? ' *' : ''}</label><input id={`company-${key}`} type={key === 'website' || key === 'logo_url' ? 'url' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className={inputClass} /></div>)}
          <div><label className={labelClass} htmlFor="company-description">Description</label><textarea id="company-description" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief company description" className={inputClass} /></div>
        </div></div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5"><button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button><button type="button" disabled={saving} onClick={saveCompany} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving…' : editingCompany ? 'Save Changes' : 'Save Company'}</button></div>
      </div></div>}
    </div>
  )
}

export default Companies
