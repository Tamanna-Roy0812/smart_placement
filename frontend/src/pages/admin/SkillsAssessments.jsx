import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiTrash2, FiX, FiSearch } from 'react-icons/fi'
import { adminApi } from '../../lib/adminApi'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const labelClass = 'mb-2 block text-sm font-medium text-slate-700'
const blankSkill = { name: '', description: '', is_active: true }
const blankQuestion = { question: '', question_type: 'mcq', optionA: '', optionB: '', optionC: '', optionD: '', correct_answer: '', difficulty: 'medium', marks: '1', negative_marks: '0', skill_id: '', is_active: true }
const blankAssessment = { title: '', description: '', skill_id: '', duration_minutes: '30', number_of_questions: '10', passing_percentage: '40', negative_marking: false, random_question_selection: false, is_active: true }

function SkillsAssessments() {
  const [activeTab, setActiveTab] = useState('skills')
  const [skills, setSkills] = useState([])
  const [questions, setQuestions] = useState([])
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [modalType, setModalType] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(blankSkill)

  const loadAll = async () => {
    setLoading(true); setError('')
    try {
      const skillRows = await adminApi('skills')
      const skillList = Array.isArray(skillRows) ? skillRows : []
      const [questionRows, assessmentRows] = await Promise.all([adminApi('questions'), adminApi('assessments')])
      const skillName = (id) => skillList.find((skill) => skill.id === id)?.name || 'Unknown skill'
      setSkills(skillList)
      setQuestions((Array.isArray(questionRows) ? questionRows : []).map((q) => ({
        ...q, questionType: q.question_type, optionA: q.options?.A || '', optionB: q.options?.B || '',
        optionC: q.options?.C || '', optionD: q.options?.D || '', correct_answer: q.correct_answer || '',
        skillName: skillName(q.skill_id),
      })))
      setAssessments((Array.isArray(assessmentRows) ? assessmentRows : []).map((a) => ({
        ...a, skillName: skillName(a.skill_id),
      })))
    } catch (err) { setError(err.message || 'Unable to load skills and assessments.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(loadAll, 0)
    return () => clearTimeout(t)
  }, [])

  const tabs = [
    { id: 'skills', label: 'Skills', icon: '🧠', title: 'Skills', description: 'Manage the skills used by the placement system.', button: '+ Add Skill' },
    { id: 'questions', label: 'Question Bank', icon: '❓', title: 'Question Bank', description: 'Manage questions used for student assessments.', button: '+ Add Question' },
    { id: 'assessments', label: 'Assessments', icon: '📝', title: 'Assessments', description: 'Create and manage student assessments.', button: '+ Create Assessment' },
  ]
  const current = tabs.find((tab) => tab.id === activeTab) || tabs[0]

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    const items = activeTab === 'skills' ? skills : activeTab === 'questions' ? questions : assessments
    if (!term) return items
    return items.filter((item) => [item.name, item.question, item.title, item.skillName, item.description, item.difficulty]
      .some((value) => String(value || '').toLowerCase().includes(term)))
  }, [activeTab, skills, questions, assessments, search])

  const openAdd = () => {
    setEditingItem(null)
    setForm(activeTab === 'skills' ? { ...blankSkill } : activeTab === 'questions' ? { ...blankQuestion, skill_id: skills[0]?.id || '' } : { ...blankAssessment, skill_id: skills[0]?.id || '' })
    setError(''); setNotice(''); setModalType(activeTab)
  }
  const openEdit = (type, item) => {
    setEditingItem(item)
    if (type === 'skills') setForm({ name: item.name || '', description: item.description || '', is_active: item.is_active ?? true })
    if (type === 'questions') setForm({ ...blankQuestion, ...item, question_type: item.question_type || item.questionType || 'mcq', correct_answer: item.correct_answer || '', skill_id: item.skill_id || '', marks: String(item.marks ?? 1), negative_marks: String(item.negative_marks ?? 0), optionA: item.options?.A || item.optionA || '', optionB: item.options?.B || item.optionB || '', optionC: item.options?.C || item.optionC || '', optionD: item.options?.D || item.optionD || '' })
    if (type === 'assessments') setForm({ ...blankAssessment, ...item, duration_minutes: String(item.duration_minutes ?? 30), number_of_questions: String(item.number_of_questions ?? 10), passing_percentage: String(item.passing_percentage ?? 40) })
    setError(''); setNotice(''); setModalType(type)
  }
  const closeModal = () => { setModalType(''); setEditingItem(null) }
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }))

  const saveItem = async () => {
    setError(''); setNotice('')
    if (modalType === 'skills' && !String(form.name || '').trim()) { setError('Skill name is required.'); return }
    if (modalType === 'questions' && (!String(form.question || '').trim() || !form.skill_id)) { setError('Question text and skill are required.'); return }
    if (modalType === 'assessments' && (!String(form.title || '').trim() || !form.skill_id)) { setError('Assessment title and skill are required.'); return }
    let body
    if (modalType === 'skills') body = { name: form.name.trim(), description: form.description.trim() || null, is_active: Boolean(form.is_active) }
    if (modalType === 'questions') body = {
      question: form.question.trim(), question_type: form.question_type, skill_id: form.skill_id,
      options: form.question_type === 'mcq' ? { A: form.optionA, B: form.optionB, C: form.optionC, D: form.optionD } : null,
      correct_answer: form.correct_answer || null, difficulty: form.difficulty || null,
      marks: Number(form.marks || 0), negative_marks: Number(form.negative_marks || 0), is_active: Boolean(form.is_active),
    }
    if (modalType === 'assessments') body = {
      title: form.title.trim(), description: form.description.trim() || null, skill_id: form.skill_id,
      duration_minutes: Number(form.duration_minutes), number_of_questions: Number(form.number_of_questions),
      passing_percentage: Number(form.passing_percentage), negative_marking: Boolean(form.negative_marking),
      random_question_selection: Boolean(form.random_question_selection), is_active: Boolean(form.is_active),
    }
    setSaving(true)
    try {
      await adminApi(modalType, { method: editingItem ? 'PUT' : 'POST', id: editingItem?.id, body })
      await loadAll(); closeModal(); setNotice(`${modalType === 'skills' ? 'Skill' : modalType === 'questions' ? 'Question' : 'Assessment'} ${editingItem ? 'updated' : 'created'} successfully.`)
    } catch (err) { setError(err.message || 'Unable to save this record.') }
    finally { setSaving(false) }
  }

  const deleteItem = async (type, item) => {
    const label = type === 'skills' ? item.name : type === 'questions' ? item.question : item.title
    if (!window.confirm(`Delete this ${type === 'skills' ? 'skill' : type === 'questions' ? 'question' : 'assessment'}? ${label || ''}`)) return
    setError(''); setNotice('')
    try { await adminApi(type, { method: 'DELETE', id: item.id }); await loadAll(); setNotice('Record deleted successfully.') }
    catch (err) { setError(err.message || 'Unable to delete record. If it is linked to another record, remove that dependency first.') }
  }

  const toggleSkill = async (skill) => {
    setError(''); setNotice('')
    try { await adminApi('skills', { method: 'PUT', id: skill.id, body: { is_active: !skill.is_active } }); await loadAll() }
    catch (err) { setError(err.message || 'Unable to update skill status.') }
  }

  const skillOptions = <>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</>
  const modalTitle = modalType === 'skills' ? (editingItem ? 'Edit Skill' : 'Add Skill') : modalType === 'questions' ? (editingItem ? 'Edit Question' : 'Add Question') : (editingItem ? 'Edit Assessment' : 'Create Assessment')

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mb-8"><p className="mb-2 text-sm font-medium text-blue-600">Admin Panel</p><h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Skills & Assessments 🧠</h1><p className="mt-2 text-slate-500">Manage skills, assessment questions, and assessment settings.</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-7 border-b border-slate-200"><div className="flex flex-wrap gap-7">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setSearch(''); setError(''); setNotice('') }} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><span>{tab.icon}</span>{tab.label}</button>)}</div></div>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        <div className="mb-6"><h2 className="text-xl font-bold text-slate-900">{current.title}</h2><p className="mt-1 text-sm text-slate-500">{current.description}</p></div>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="relative w-full md:max-w-md"><FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder={`Search ${current.title.toLowerCase()}...`} className={`${inputClass} pl-11`} /></div><button type="button" onClick={openAdd} disabled={activeTab !== 'skills' && skills.length === 0} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50">{current.button}</button></div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {activeTab === 'skills' && <table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-4">Skill</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="px-5 py-12 text-center text-slate-500">Loading skills…</td></tr> : filteredItems.length === 0 ? <tr><td colSpan="4" className="px-5 py-12 text-center text-slate-500">No skills found.</td></tr> : filteredItems.map((skill) => <tr key={skill.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold text-slate-800">{skill.name}</td><td className="px-5 py-4 text-slate-600">{skill.description || '—'}</td><td className="px-5 py-4"><button type="button" onClick={() => toggleSkill(skill)} className={`rounded-full px-3 py-1 text-xs font-semibold ${skill.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{skill.is_active ? 'Enabled' : 'Disabled'}</button></td><td className="px-5 py-4"><div className="flex items-center gap-3"><button type="button" onClick={() => openEdit('skills', skill)} className="inline-flex items-center gap-1.5 font-medium text-blue-600"><FiEdit2 size={15} />Edit</button><button type="button" onClick={() => deleteItem('skills', skill)} className="inline-flex items-center gap-1.5 font-medium text-red-500"><FiTrash2 size={15} />Delete</button></div></td></tr>)}</tbody></table>}
          {activeTab === 'questions' && <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-4">Question</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Skill</th><th className="px-5 py-4">Difficulty</th><th className="px-5 py-4">Marks</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Loading questions…</td></tr> : filteredItems.length === 0 ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">No questions found.</td></tr> : filteredItems.map((question) => <tr key={question.id} className="border-t border-slate-100"><td className="max-w-md px-5 py-4 font-medium text-slate-800">{question.question}</td><td className="px-5 py-4 text-slate-600">{question.question_type}</td><td className="px-5 py-4 text-slate-600">{question.skillName}</td><td className="px-5 py-4 text-slate-600">{question.difficulty || '—'}</td><td className="px-5 py-4 text-slate-600">{question.marks ?? 0}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><button type="button" onClick={() => openEdit('questions', question)} className="inline-flex items-center gap-1.5 font-medium text-blue-600"><FiEdit2 size={15} />Edit</button><button type="button" onClick={() => deleteItem('questions', question)} className="inline-flex items-center gap-1.5 font-medium text-red-500"><FiTrash2 size={15} />Delete</button></div></td></tr>)}</tbody></table>}
          {activeTab === 'assessments' && <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-4">Assessment</th><th className="px-5 py-4">Skill</th><th className="px-5 py-4">Duration</th><th className="px-5 py-4">Questions</th><th className="px-5 py-4">Passing %</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Loading assessments…</td></tr> : filteredItems.length === 0 ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">No assessments found.</td></tr> : filteredItems.map((assessment) => <tr key={assessment.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold text-slate-800">{assessment.title}</td><td className="px-5 py-4 text-slate-600">{assessment.skillName}</td><td className="px-5 py-4 text-slate-600">{assessment.duration_minutes} min</td><td className="px-5 py-4 text-slate-600">{assessment.number_of_questions}</td><td className="px-5 py-4 text-slate-600">{assessment.passing_percentage}%</td><td className="px-5 py-4"><div className="flex items-center gap-3"><button type="button" onClick={() => openEdit('assessments', assessment)} className="inline-flex items-center gap-1.5 font-medium text-blue-600"><FiEdit2 size={15} />Edit</button><button type="button" onClick={() => deleteItem('assessments', assessment)} className="inline-flex items-center gap-1.5 font-medium text-red-500"><FiTrash2 size={15} />Delete</button></div></td></tr>)}</tbody></table>}
        </div>
      </div>

      {modalType && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5"><div><h2 className="text-xl font-bold text-slate-900">{modalTitle}</h2><p className="mt-1 text-sm text-slate-500">Changes are saved to the Supabase database.</p></div><button type="button" onClick={closeModal} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><FiX size={20} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto"><div className="grid gap-5 p-6">
          {modalType === 'skills' && <><div><label className={labelClass}>Skill Name *</label><input value={form.name || ''} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Java" className={inputClass} /></div><div><label className={labelClass}>Description</label><textarea rows="3" value={form.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="Describe this skill" className={inputClass} /></div><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setField('is_active', e.target.checked)} className="h-4 w-4" /><span className="text-sm font-medium text-slate-700">Enable this skill</span></label></>}
          {modalType === 'questions' && <><div><label className={labelClass}>Question *</label><textarea rows="3" value={form.question || ''} onChange={(e) => setField('question', e.target.value)} placeholder="Enter the question" className={inputClass} /></div><div className="grid gap-5 md:grid-cols-2"><div><label className={labelClass}>Question Type</label><select value={form.question_type || 'mcq'} onChange={(e) => setField('question_type', e.target.value)} className={inputClass}><option value="mcq">MCQ</option><option value="true_false">True / False</option><option value="fill_in_blank">Fill in the Blank</option><option value="programming">Programming</option></select></div><div><label className={labelClass}>Skill *</label><select value={form.skill_id || ''} onChange={(e) => setField('skill_id', e.target.value)} className={inputClass}><option value="">Select skill</option>{skillOptions}</select></div></div>{form.question_type === 'mcq' && <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">{[['optionA','Option A'],['optionB','Option B'],['optionC','Option C'],['optionD','Option D']].map(([key,label]) => <div key={key}><label className={labelClass}>{label}</label><input value={form[key] || ''} onChange={(e) => setField(key, e.target.value)} className={inputClass} /></div>)}</div>}<div><label className={labelClass}>Correct Answer</label>{form.question_type === 'mcq' ? <select value={form.correct_answer || ''} onChange={(e) => setField('correct_answer', e.target.value)} className={inputClass}><option value="">Select correct answer</option><option value="A">Option A</option><option value="B">Option B</option><option value="C">Option C</option><option value="D">Option D</option></select> : form.question_type === 'true_false' ? <select value={form.correct_answer || ''} onChange={(e) => setField('correct_answer', e.target.value)} className={inputClass}><option value="">Select answer</option><option value="True">True</option><option value="False">False</option></select> : <textarea rows="2" value={form.correct_answer || ''} onChange={(e) => setField('correct_answer', e.target.value)} className={inputClass} />}</div><div className="grid gap-5 md:grid-cols-3"><div><label className={labelClass}>Difficulty</label><select value={form.difficulty || 'medium'} onChange={(e) => setField('difficulty', e.target.value)} className={inputClass}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div><div><label className={labelClass}>Marks</label><input type="number" min="0" step="0.5" value={form.marks ?? '1'} onChange={(e) => setField('marks', e.target.value)} className={inputClass} /></div><div><label className={labelClass}>Negative Marks</label><input type="number" min="0" step="0.25" value={form.negative_marks ?? '0'} onChange={(e) => setField('negative_marks', e.target.value)} className={inputClass} /></div></div><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setField('is_active', e.target.checked)} className="h-4 w-4" /><span className="text-sm font-medium text-slate-700">Enable this question</span></label></>}
          {modalType === 'assessments' && <><div><label className={labelClass}>Assessment Title *</label><input value={form.title || ''} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Java Programming Assessment" className={inputClass} /></div><div><label className={labelClass}>Description</label><textarea rows="3" value={form.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="Assessment description" className={inputClass} /></div><div><label className={labelClass}>Skill *</label><select value={form.skill_id || ''} onChange={(e) => setField('skill_id', e.target.value)} className={inputClass}><option value="">Select skill</option>{skillOptions}</select></div><div className="grid gap-5 md:grid-cols-3"><div><label className={labelClass}>Duration (minutes)</label><input type="number" min="1" value={form.duration_minutes ?? '30'} onChange={(e) => setField('duration_minutes', e.target.value)} className={inputClass} /></div><div><label className={labelClass}>Number of Questions</label><input type="number" min="1" value={form.number_of_questions ?? '10'} onChange={(e) => setField('number_of_questions', e.target.value)} className={inputClass} /></div><div><label className={labelClass}>Passing Percentage</label><input type="number" min="0" max="100" value={form.passing_percentage ?? '40'} onChange={(e) => setField('passing_percentage', e.target.value)} className={inputClass} /></div></div><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={Boolean(form.negative_marking)} onChange={(e) => setField('negative_marking', e.target.checked)} className="h-4 w-4" /><span className="text-sm font-medium text-slate-700">Enable negative marking</span></label><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={Boolean(form.random_question_selection)} onChange={(e) => setField('random_question_selection', e.target.checked)} className="h-4 w-4" /><span className="text-sm font-medium text-slate-700">Randomly select questions</span></label><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setField('is_active', e.target.checked)} className="h-4 w-4" /><span className="text-sm font-medium text-slate-700">Activate this assessment</span></label></>}
        </div></div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-5"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" disabled={saving} onClick={saveItem} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Save'}</button></div>
      </div></div>}
    </div>
  )
}

export default SkillsAssessments
