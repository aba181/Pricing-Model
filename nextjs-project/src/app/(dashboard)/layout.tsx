import { Sidebar } from '@/components/sidebar/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_URL ?? 'http://localhost:8000'

async function getUserRole(token: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `access_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return 'user'
    const user = await res.json()
    return user.role ?? 'user'
  } catch {
    return 'user'
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Defense-in-depth: verify session in layout, not just middleware
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const userRole = await getUserRole(session.token)

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 overflow-hidden">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
