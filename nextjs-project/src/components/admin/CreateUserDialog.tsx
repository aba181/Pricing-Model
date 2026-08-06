'use client'

import { useState, useRef, useEffect, useActionState } from 'react'
import { UserPlus } from 'lucide-react'
import { MobileSheet } from '@/components/ui/MobileSheet'
import {
  createUserAction,
  type CreateUserState,
} from '@/app/actions/admin'

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'admin', label: 'Admin' },
]

export function CreateUserDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(createUserAction, {} as CreateUserState)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setTimeout(() => setIsOpen(false), 1500)
    }
  }, [state.success])

  const closeDialog = () => setIsOpen(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="av-btn av-btn-primary">
        <UserPlus size={15} />
        Invite User
      </button>

      <MobileSheet
        isOpen={isOpen}
        onClose={closeDialog}
        title="Invite User"
        maxWidth="max-w-sm"
        closeOnScrim={false}
        footer={
          <div className="flex gap-2">
            <button
              type="submit"
              form="create-user-form"
              disabled={isPending}
              className="av-btn av-btn-primary disabled:opacity-60"
            >
              {isPending ? 'Inviting...' : 'Invite'}
            </button>
            <button
              type="button"
              onClick={closeDialog}
              disabled={isPending}
              className="av-btn av-btn-ghost disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        }
      >
        {isOpen && (
          <div className="p-6">
            {/* Success banner */}
            {state.success && (
              <div
                className="mb-4 px-3 py-2 rounded text-sm"
                style={{
                  color: 'var(--pos)',
                  background: 'var(--pos-soft)',
                  border: '1px solid color-mix(in srgb, var(--pos) 30%, transparent)',
                }}
              >
                User invited successfully
              </div>
            )}

            {/* Error banner */}
            {state.error && (
              <div
                className="mb-4 px-3 py-2 rounded text-sm"
                style={{
                  color: 'var(--neg)',
                  background: 'var(--neg-soft)',
                  border: '1px solid color-mix(in srgb, var(--neg) 30%, transparent)',
                }}
              >
                {state.error}
              </div>
            )}

            <form id="create-user-form" ref={formRef} action={formAction} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="John Doe"
                  className="av-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="colleague@company.com"
                  className="av-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
                  Role
                </label>
                <select
                  name="role"
                  defaultValue="user"
                  className="av-input w-full"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>
                  Viewer: read-only access to Dashboard and Quotes only
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--ink-2)' }}>
                  <input
                    type="checkbox"
                    name="can_view_costs"
                    className="av-checkbox"
                  />
                  Can view naked costs
                </label>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>
                  Grants visibility of cost build-up, profit, and margins. Admins always have access.
                </p>
              </div>

            </form>
          </div>
        )}
      </MobileSheet>
    </>
  )
}
