'use client'

import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'
import { ROLE_LABEL, initials } from '@/lib/user-display'

interface TopBarProps {
  userEmail?: string
  userRole?: string
}

// Route → breadcrumb (group › page)
const ROUTES: Record<string, { group: string; page: string }> = {
  dashboard: { group: 'Workspace', page: 'Dashboard' },
  calculation: { group: 'Workspace', page: 'Pricing Workspace' },
  pnl: { group: 'Workspace', page: 'Profit & Loss' },
  quotes: { group: 'Workspace', page: 'Quotes' },
  aircraft: { group: 'Reference Data', page: 'Aircraft Fleet' },
  crew: { group: 'Reference Data', page: 'Crew Costs' },
  costs: { group: 'Reference Data', page: 'Cost Assumptions' },
  admin: { group: 'Reference Data', page: 'Admin' },
}

export function TopBar({ userEmail, userRole = 'user' }: TopBarProps) {
  const pathname = usePathname()
  const key = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  const crumb = ROUTES[key] ?? { group: 'Workspace', page: 'Dashboard' }

  return (
    <header
      className="h-[62px] flex items-center gap-4 px-4 lg:px-6 shrink-0 sticky top-0 z-30"
      style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
        <span>{crumb.group}</span>
        <span style={{ color: 'var(--muted-2)' }}>›</span>
        <span className="font-semibold" style={{ color: 'var(--ink)' }}>
          {crumb.page}
        </span>
      </div>

      <div className="flex-1" />

      {/* User — mobile/tablet only; at lg+ this lives in the sidebar footer */}
      <div className="flex lg:hidden items-center gap-2.5 pl-4" style={{ borderLeft: '1px solid var(--line)' }}>
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
