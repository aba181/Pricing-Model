'use client'

import { useState, useRef, useEffect, useActionState } from 'react'
import { KeyRound } from 'lucide-react'
import { MobileSheet } from '@/components/ui/MobileSheet'
import {
  resetPasswordAction,
  type ResetPasswordState,
} from '@/app/actions/admin'

interface ResetPasswordDialogProps {
  userId: number
  userName: string
}

export function ResetPasswordDialog({ userId, userName }: ResetPasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const boundAction = resetPasswordAction.bind(null, userId)
  const [state, formAction, isPending] = useActionState(boundAction, {} as ResetPasswordState)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setTimeout(() => setIsOpen(false), 1500)
    }
  }, [state.success])

  const closeDialog = () => setIsOpen(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="av-btn av-btn-ghost !py-1.5 !px-2.5"
        title="Reset password"
        aria-label="Reset password"
      >
        <KeyRound size={15} />
      </button>

      <MobileSheet
        isOpen={isOpen}
        onClose={closeDialog}
        title="Reset Password"
        maxWidth="max-w-sm"
        closeOnScrim={false}
        footer={
          <div className="flex gap-2">
            <button
              type="submit"
              form={`reset-password-form-${userId}`}
              disabled={isPending}
              className="av-btn av-btn-primary disabled:opacity-60"
            >
              {isPending ? 'Resetting...' : 'Reset Password'}
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
            <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>
              Set a new password for <span className="font-medium" style={{ color: 'var(--ink)' }}>{userName}</span>
            </p>

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
                Password reset successfully
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

            <form id={`reset-password-form-${userId}`} ref={formRef} action={formAction} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  name="new_password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="av-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  minLength={8}
                  placeholder="Repeat password"
                  className="av-input w-full"
                />
              </div>

            </form>
          </div>
        )}
      </MobileSheet>
    </>
  )
}
