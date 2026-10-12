import { useState } from 'react'
import { studentApi } from '../../lib/studentApi'
import { Card, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { formatDate, useAsync } from '../../components/student/helpers'

async function load() {
  const link = await studentApi('resume/link').catch((e) => (e.status === 404 ? { data: null } : Promise.reject(e)))
  return link.data
}

function ResumeUpload() {
  const { data: resume, loading, error, reload } = useAsync(load)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [message, setMessage] = useState('')

  const upload = async () => {
    setProblem('')
    setMessage('')
    if (!file) return setProblem('Please choose a PDF resume first.')
    if (file.size > 5 * 1024 * 1024) return setProblem('Resume must be 5 MB or smaller.')
    try {
      setBusy(true)
      await studentApi('resume/upload', {
        method: 'POST',
        rawBody: file,
        headers: {
          'Content-Type': file.type || 'application/pdf',
          'X-File-Name': encodeURIComponent(file.name),
        },
      })
      setFile(null)
      setMessage('Resume uploaded.')
      reload()
    } catch (e) {
      setProblem(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete your resume?')) return
    try {
      setBusy(true)
      await studentApi('resume', { method: 'DELETE' })
      setMessage('Resume deleted.')
      reload()
    } catch (e) {
      setProblem(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Resume" subtitle="Upload a text-based PDF (up to 5 MB). Placement officers see it when you apply, and it powers your job matches." />
      <ErrorBox message={error} onRetry={reload} />

      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Current resume</h2>
          {loading ? (
            <Loading />
          ) : resume ? (
            <div>
              <p className="font-medium text-slate-800">📄 {resume.file_name}</p>
              <p className="text-xs text-slate-500">Uploaded {formatDate(resume.uploaded_at)}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {resume.view_url && (
                  <a href={resume.view_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View</a>
                )}
                {resume.download_url && (
                  <a href={resume.download_url} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Download</a>
                )}
                <button onClick={remove} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No resume uploaded yet.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">{resume ? 'Replace resume' : 'Upload resume'}</h2>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50">
            <span className="text-3xl">📎</span>
            <span className="mt-2 text-sm font-semibold text-blue-600">Click here to choose your resume (PDF)</span>
            <input
              type="file"
              accept="application/pdf,.pdf,.txt"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="sr-only"
            />
          </label>
          {file && <p className="mt-2 text-sm font-medium text-emerald-700">Selected: {file.name} — now click Upload</p>}
          <ErrorBox message={problem} />
          {message && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
          <button
            onClick={upload}
            disabled={busy}
            className="mt-4 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Working…' : 'Upload'}
          </button>
          <p className="mt-3 text-xs text-slate-400">Scanned/image-only PDFs can't be read by the matching tool — export your resume as a normal PDF.</p>
        </Card>
      </div>
    </div>
  )
}

export default ResumeUpload
