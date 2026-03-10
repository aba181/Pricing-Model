import { logoutAction } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'

interface TopBarProps {
  userEmail?: string
}

export function TopBar({ userEmail }: TopBarProps) {
  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-6 shrink-0">
      <div /> {/* Breadcrumb placeholder -- populated in future phases */}
      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            {userEmail}
          </span>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  )
}
