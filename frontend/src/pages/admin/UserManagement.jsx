import { useEffect, useMemo, useState } from 'react'
import {
  FiEdit2,
  FiKey,
  FiPower,
  FiSearch,
  FiTrash2,
  FiUserPlus,
  FiX,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'

const API_BASE = 'http://localhost:5000/api/admin'

function UserManagement() {
  const [activeTab, setActiveTab] = useState('students')

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showUserForm, setShowUserForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] =
    useState(false)

  const [editingUser, setEditingUser] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [statusAction, setStatusAction] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    role: 'student',
  })

  const [resetPassword, setResetPassword] = useState('')

  /* ================= API HELPER ================= */

  const apiRequest = async (endpoint, options = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('Your session has expired. Please log in again.')
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.')
    }

    return data
  }

  /* ================= LOAD USERS ================= */

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await apiRequest('/users')

      setUsers(data.users || [])
    } catch (err) {
      console.error('Failed to load users:', err)
      setError(err.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(loadUsers, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ================= FILTER USERS ================= */

  const currentUsers = useMemo(() => {
    const role =
      activeTab === 'students'
        ? 'student'
        : 'placement-officer'

    return users.filter((user) => user.role === role)
  }, [users, activeTab])

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) {
      return currentUsers
    }

    return currentUsers.filter((user) =>
      (user.email || '').toLowerCase().includes(search)
    )
  }, [currentUsers, searchTerm])

  /* ================= CREATE USER ================= */

  const openCreateUser = () => {
    setEditingUser(null)

    setUserForm({
      email: '',
      password: '',
      role:
        activeTab === 'students'
          ? 'student'
          : 'placement-officer',
    })

    setError('')
    setShowUserForm(true)
  }

  /* ================= EDIT USER ================= */

  const openEditUser = (user) => {
    setEditingUser(user)

    setUserForm({
      email: user.email || '',
      password: '',
      role: user.role || 'student',
    })

    setError('')
    setShowUserForm(true)
  }

  const closeUserForm = () => {
    setShowUserForm(false)
    setEditingUser(null)

    setUserForm({
      email: '',
      password: '',
      role: 'student',
    })
  }

  const saveUser = async () => {
    try {
      setError('')

      if (!userForm.email.trim()) {
        setError('Email address is required.')
        return
      }

      if (!editingUser && userForm.password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }

      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            email: userForm.email.trim(),
            role: userForm.role,
          }),
        })
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify({
            email: userForm.email.trim(),
            password: userForm.password,
            role: userForm.role,
          }),
        })
      }

      closeUserForm()
      await loadUsers()
    } catch (err) {
      console.error('Failed to save user:', err)
      setError(err.message || 'Failed to save user.')
    }
  }

  /* ================= DELETE USER ================= */

  const openDeleteModal = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setSelectedUser(null)
    setShowDeleteModal(false)
  }

  const confirmDelete = async () => {
    if (!selectedUser) return

    try {
      setError('')

      await apiRequest(`/users/${selectedUser.id}`, {
        method: 'DELETE',
      })

      closeDeleteModal()
      await loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      setError(err.message || 'Failed to delete user.')
    }
  }

  /* ================= SUSPEND / ACTIVATE ================= */

  const openStatusModal = (user, action) => {
    setSelectedUser(user)
    setStatusAction(action)
    setShowStatusModal(true)
  }

  const closeStatusModal = () => {
    setSelectedUser(null)
    setStatusAction(null)
    setShowStatusModal(false)
  }

  const confirmStatusChange = async () => {
    if (!selectedUser || !statusAction) return

    try {
      setError('')

      const endpoint =
        statusAction === 'suspend'
          ? `/users/${selectedUser.id}/suspend`
          : `/users/${selectedUser.id}/activate`

      await apiRequest(endpoint, {
        method: 'POST',
      })

      closeStatusModal()
      await loadUsers()
    } catch (err) {
      console.error('Failed to change user status:', err)
      setError(err.message || 'Failed to change user status.')
    }
  }

  /* ================= RESET PASSWORD ================= */

  const openResetPasswordModal = (user) => {
    setSelectedUser(user)
    setResetPassword('')
    setShowResetPasswordModal(true)
  }

  const closeResetPasswordModal = () => {
    setSelectedUser(null)
    setResetPassword('')
    setShowResetPasswordModal(false)
  }

  const confirmResetPassword = async () => {
    if (!selectedUser) return

    if (resetPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setError('')

      await apiRequest(
        `/users/${selectedUser.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({
            password: resetPassword,
          }),
        }
      )

      closeResetPasswordModal()

      alert('Password reset successfully.')
    } catch (err) {
      console.error('Failed to reset password:', err)
      setError(err.message || 'Failed to reset password.')
    }
  }

  /* ================= UI HELPERS ================= */

  const roleLabel = (role) => {
    if (role === 'placement-officer') {
      return 'Placement Officer'
    }

    return 'Student'
  }

  const formatDate = (date) => {
    if (!date) return '—'

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">

      {/* ================= HEADER ================= */}

      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">
          Admin Panel
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          User Management
        </h1>

        <p className="mt-2 text-slate-500">
          Manage students and placement officers.
        </p>
      </div>

      {/* ================= MAIN CARD ================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        {/* ================= TABS ================= */}

        <div className="mb-7 border-b border-slate-200">
          <div className="flex flex-wrap gap-7">

            <button
              type="button"
              onClick={() => {
                setActiveTab('students')
                setSearchTerm('')
                setError('')
              }}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === 'students'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Students
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('officers')
                setSearchTerm('')
                setError('')
              }}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === 'officers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Placement Officers
            </button>

          </div>
        </div>

        {/* ================= SECTION HEADER ================= */}

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {activeTab === 'students'
              ? 'Students'
              : 'Placement Officers'}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {activeTab === 'students'
              ? 'Manage student accounts.'
              : 'Manage placement officer accounts.'}
          </p>
        </div>

        {/* ================= SEARCH + CREATE ================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="relative w-full md:max-w-md">
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'students'
                  ? 'Search students by email...'
                  : 'Search placement officers by email...'
              }
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* ONLY CREATE USER BUTTON */}
          <button
            type="button"
            onClick={openCreateUser}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <FiUserPlus size={17} />
            Create User
          </button>

        </div>

        {/* ================= ERROR ================= */}

        {error && !showUserForm && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ================= USER TABLE ================= */}

        <div className="overflow-hidden rounded-xl border border-slate-200">

          {/* TABLE HEADER */}

          <div className="grid grid-cols-5 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Email</span>
            <span>Status</span>
            <span>Role</span>
            <span>Created</span>
            <span>Actions</span>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Loading users...
            </div>
          )}

          {/* EMPTY */}

          {!loading && filteredUsers.length === 0 && (
            <div className="px-5 py-14 text-center">

              <h3 className="text-lg font-semibold text-slate-800">
                {searchTerm
                  ? `No ${
                      activeTab === 'students'
                        ? 'students'
                        : 'placement officers'
                    } found`
                  : `No ${
                      activeTab === 'students'
                        ? 'students'
                        : 'placement officers'
                    } available`}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {searchTerm
                  ? 'Try searching with a different email address.'
                  : 'Create an account using the Create User button above.'}
              </p>

            </div>
          )}

          {/* USERS */}

          {!loading &&
            filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                roleLabel={roleLabel}
                formatDate={formatDate}
                onEdit={openEditUser}
                onDelete={openDeleteModal}
                onStatusChange={openStatusModal}
                onResetPassword={openResetPasswordModal}
              />
            ))}
        </div>

        {/* RESULT COUNT */}

        {!loading && (
          <div className="mt-4 text-right text-sm text-slate-400">
            {filteredUsers.length}{' '}
            {filteredUsers.length === 1 ? 'user' : 'users'} found
          </div>
        )}

      </div>

      {/* ================= CREATE / EDIT MODAL ================= */}

      {showUserForm && (
        <ModalOverlay>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

            <div className="flex items-start justify-between border-b border-slate-200 p-6">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingUser ? 'Edit User' : 'Create User'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingUser
                    ? 'Update the user account information.'
                    : 'Create an account for a student or placement officer.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUserForm}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX size={20} />
              </button>

            </div>

            <div className="space-y-5 p-6">

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="e.g. student@example.com"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* PASSWORD - CREATE ONLY */}

              {!editingUser && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>

                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}

              {/* ROLE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Role
                </label>

                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      role: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="student">
                    Student
                  </option>

                  <option value="placement-officer">
                    Placement Officer
                  </option>
                </select>
              </div>

              {/* INFO */}

              {!editingUser && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">
                    Administrator-created account
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-600">
                    Students and Placement Officers do not have
                    self-registration. Their accounts are created
                    by an Administrator.
                  </p>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">

              <button
                type="button"
                onClick={closeUserForm}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveUser}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>

            </div>

          </div>
        </ModalOverlay>
      )}

      {/* ================= DELETE MODAL ================= */}

      {showDeleteModal && selectedUser && (
        <ConfirmationModal
          title="Delete User?"
          description={`Are you sure you want to permanently delete ${selectedUser.email}? This action cannot be undone.`}
          confirmText="Delete User"
          confirmClass="bg-red-500 hover:bg-red-600"
          icon={<FiTrash2 size={21} className="text-red-500" />}
          onCancel={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      )}

      {/* ================= STATUS MODAL ================= */}

      {showStatusModal && selectedUser && (
        <ConfirmationModal
          title={
            statusAction === 'suspend'
              ? 'Suspend User?'
              : 'Activate User?'
          }
          description={
            statusAction === 'suspend'
              ? `Are you sure you want to suspend ${selectedUser.email}? They will no longer be able to use their account while suspended.`
              : `Are you sure you want to activate ${selectedUser.email}? Their account will become active again.`
          }
          confirmText={
            statusAction === 'suspend'
              ? 'Suspend User'
              : 'Activate User'
          }
          confirmClass={
            statusAction === 'suspend'
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }
          icon={<FiPower size={21} className="text-slate-600" />}
          onCancel={closeStatusModal}
          onConfirm={confirmStatusChange}
        />
      )}

      {/* ================= RESET PASSWORD MODAL ================= */}

      {showResetPasswordModal && selectedUser && (
        <ModalOverlay>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

            <div className="flex items-start justify-between border-b border-slate-200 p-6">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Reset Password
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Set a new password for {selectedUser.email}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeResetPasswordModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX size={20} />
              </button>

            </div>

            <div className="p-6">

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <label className="mb-2 block text-sm font-medium text-slate-700">
                New Password
              </label>

              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">

              <button
                type="button"
                onClick={closeResetPasswordModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmResetPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <FiKey size={16} />
                Reset Password
              </button>

            </div>

          </div>
        </ModalOverlay>
      )}

    </div>
  )
}

/* ================= USER ROW ================= */

function UserRow({
  user,
  roleLabel,
  formatDate,
  onEdit,
  onDelete,
  onStatusChange,
  onResetPassword,
}) {
  const isSuspended =
    user.status?.toLowerCase() === 'suspended'

  return (
    <div className="grid grid-cols-5 items-center border-t border-slate-100 px-5 py-4 text-sm">

      {/* EMAIL */}

      <span className="truncate pr-4 font-medium text-slate-800">
        {user.email}
      </span>

      {/* STATUS */}

      <span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isSuspended
              ? 'bg-orange-50 text-orange-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {user.status}
        </span>
      </span>

      {/* ROLE */}

      <span className="text-slate-600">
        {roleLabel(user.role)}
      </span>

      {/* CREATED */}

      <span className="text-slate-500">
        {formatDate(user.created_at)}
      </span>

      {/* ACTIONS */}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">

        {/* EDIT */}

        <button
          type="button"
          onClick={() => onEdit(user)}
          className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-800"
        >
          <FiEdit2 size={14} />
          Edit
        </button>

        {/* SUSPEND / ACTIVATE */}

        {isSuspended ? (
          <button
            type="button"
            onClick={() =>
              onStatusChange(user, 'activate')
            }
            className="inline-flex items-center gap-1.5 font-medium text-emerald-600 hover:text-emerald-800"
          >
            <FiPower size={14} />
            Activate
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              onStatusChange(user, 'suspend')
            }
            className="inline-flex items-center gap-1.5 font-medium text-orange-600 hover:text-orange-800"
          >
            <FiPower size={14} />
            Suspend
          </button>
        )}

        {/* RESET PASSWORD */}

        <button
          type="button"
          onClick={() => onResetPassword(user)}
          className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-800"
        >
          <FiKey size={14} />
          Reset
        </button>

        {/* DELETE */}

        <button
          type="button"
          onClick={() => onDelete(user)}
          className="inline-flex items-center gap-1.5 font-medium text-red-500 hover:text-red-700"
        >
          <FiTrash2 size={14} />
          Delete
        </button>

      </div>

    </div>
  )
}

/* ================= MODAL OVERLAY ================= */

function ModalOverlay({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      {children}
    </div>
  )
}

/* ================= CONFIRMATION MODAL ================= */

function ConfirmationModal({
  title,
  description,
  confirmText,
  confirmClass,
  icon,
  onCancel,
  onConfirm,
}) {
  return (
    <ModalOverlay>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

        <div className="p-6">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50">
              {icon}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>

          </div>

        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-6">

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${confirmClass}`}
          >
            {confirmText}
          </button>

        </div>

      </div>
    </ModalOverlay>
  )
}

export default UserManagement