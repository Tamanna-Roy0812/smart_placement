import { studentApi } from '../../lib/studentApi'
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader } from '../../components/student/ui'
import { formatDate, useAsync } from '../../components/student/helpers'

function Notifications() {
  const { data, loading, error, reload } = useAsync(() => studentApi('notifications').then((r) => r.data || []))

  const markRead = async (id) => {
    await studentApi(`notifications/${id}/read`, { method: 'PATCH' }).catch(() => {})
    reload()
  }
  const markAll = async () => {
    await Promise.all((data || []).filter((n) => !n.is_read).map((n) => studentApi(`notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})))
    reload()
  }
  const unread = (data || []).filter((n) => !n.is_read).length

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with your placement activities."
        action={unread > 0 && (
          <button onClick={markAll} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Mark all as read
          </button>
        )}
      />
      <ErrorBox message={error} onRetry={reload} />
      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <Card><Empty icon="🔔" title="No notifications" text="New notifications and placement updates will appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {data.map((n) => (
            <Card key={n.id} className={`!p-5 ${n.is_read ? '' : 'border-blue-200 bg-blue-50/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{n.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                </div>
                {n.is_read ? (
                  <Chip>Read</Chip>
                ) : (
                  <button onClick={() => markRead(n.id)} className="text-xs font-semibold text-blue-600 hover:underline">Mark read</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
