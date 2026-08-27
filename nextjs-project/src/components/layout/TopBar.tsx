'use client'

import { logoutAction } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'
import { ROLE_LABEL, initials } from '@/lib/user-display'

interface TopBarProps {
  userEmail?: string
  userRole?: string
}

// Mobile/tablet only: at lg+ the sidebar footer carries the user + sign-out,
// so the bar is hidden there rather than holding an empty strip of chrome.
export function TopBar({ userEmail, userRole = 'user' }: TopBarProps) {
  return (
    <header
      className="h-[62px] lg:hidden flex items-center justify-end gap-4 px-4 shrink-0 sticky top-0 z-30"
      style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-bold text-white"
          style={{ background: 'var(--navy)' }}
        >
          {initials(userEmail)}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>
            {userEmail?.split('@')[0] ?? 'Avora User'}
          </div>
          <div className="text-[10.5px]" style={{ color: 'var(--muted)' }}>
            {ROLE_LABEL[userRole] ?? 'Pricing'}
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="grid place-items-center w-11 h-11 -my-2 -mr-1 touch-manip transition-colors"
            style={{ color: 'var(--muted)' }}
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  )
}
